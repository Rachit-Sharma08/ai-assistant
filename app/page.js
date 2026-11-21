"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatMessage from "../components/ChatMessage.js";
import Composer from "../components/Composer.js";
import EmptyState from "../components/EmptyState.js";
import Sidebar from "../components/Sidebar.js";
import { IconArrowDown, IconSidebar, IconSpeaker, IconSpeakerOff, Sparkle } from "../components/icons.js";
import { APP_NAME, SEARCH_SENTINEL, SOURCES_SENTINEL } from "../lib/config.js";
import {
  extractSentences,
  flushSentences,
  speechQueue,
} from "../lib/speech-queue.js";
import {
  createId,
  loadChats,
  saveChats,
  titleFromMessage,
} from "../lib/chat-store.js";

const THEME_KEY = "rachits-assistant-theme";
const SPEECH_KEY = "rachits-assistant-speech";

const ERROR_MESSAGES = {
  rate_limited: "Free limit abhi full hai. 30-60 second baad dobara try karo.",
  network_error: "Internet ka issue lag raha hai. Connection check karke dobara try karo.",
  server_error: "Kuch gadbad ho gayi. Dobara try karo.",
};

export default function ChatPage() {
  const [hydrated, setHydrated] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAssistantId, setActiveAssistantId] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  // null = CSS default (mobile hidden, desktop visible); true/false after toggle.
  const [sidebarOpen, setSidebarOpen] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [stickToBottom, setStickToBottom] = useState(true);
  const [speechOn, setSpeechOn] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const textareaRef = useRef(null);
  const mainRef = useRef(null);
  const abortRef = useRef(null);
  const activeRef = useRef(false);
  const stickRef = useRef(true);
  const editTargetRef = useRef(null);
  const speechOnRef = useRef(false);
  const speechCursorRef = useRef(0);
  const pendingSpeechRef = useRef("");

  const activeChat = chats.find((chat) => chat.id === activeId) || null;
  const messages = activeChat?.messages || [];
  const showEmpty = hydrated && messages.length === 0;

  /* ---- hydration: chats + theme ---- */
  useEffect(() => {
    const stored = loadChats();
    setChats(stored.chats);
    setActiveId(stored.activeId);
    let storedTheme = null;
    try {
      storedTheme = window.localStorage.getItem(THEME_KEY);
    } catch {
      storedTheme = null;
    }
    const initial =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    let storedSpeech = null;
    try {
      storedSpeech = window.localStorage.getItem(SPEECH_KEY);
    } catch {
      storedSpeech = null;
    }
    setSpeechOn(storedSpeech === "on");
    setHydrated(true);
  }, []);

  /* ---- keep speech ref in sync with state ---- */
  useEffect(() => {
    speechOnRef.current = speechOn;
  }, [speechOn]);

  /* ---- stop any speech + reset sentence buffers ---- */
  const stopSpeech = useCallback(() => {
    speechQueue.clear();
    speechCursorRef.current = 0;
    pendingSpeechRef.current = "";
    setIsSearching(false);
  }, []);

  /* ---- persist chats (debounced so streaming doesn't spam storage) ---- */
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => saveChats({ chats, activeId }), 300);
    return () => window.clearTimeout(timer);
  }, [hydrated, chats, activeId]);

  /* ---- persist theme ---- */
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage blocked — theme still applies for this session.
    }
  }, [hydrated, theme]);

  /* ---- smart auto-scroll: follow tokens only while the user is at the bottom ---- */
  useEffect(() => {
    if (!stickRef.current) return;
    const element = mainRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, errorType]);

  const handleScroll = useCallback(() => {
    const element = mainRef.current;
    if (!element) return;
    const nearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    stickRef.current = nearBottom;
    setStickToBottom(nearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    const element = mainRef.current;
    if (!element) return;
    stickRef.current = true;
    setStickToBottom(true);
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, []);

  const patchChat = useCallback((chatId, updater) => {
    setChats((current) =>
      current.map((chat) => (chat.id === chatId ? updater(chat) : chat)),
    );
  }, []);

  const isMobile = () => !window.matchMedia("(min-width: 1024px)").matches;

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((previous) => {
      const effective = previous ?? window.matchMedia("(min-width: 1024px)").matches;
      return !effective;
    });
  }, []);

  /* ---- sending ---- */
  const sendMessage = useCallback(
    async (rawText, options = {}) => {
      const content = rawText.trim();
      if (!content || activeRef.current) return;

      activeRef.current = true;
      editTargetRef.current = null;
      setErrorType(null);
      setCopiedId(null);
      stopSpeech();

      const now = Date.now();
      const assistantId = createId();
      let chatId = activeId;
      let history;

      if (options.editUserId) {
        const index = messages.findIndex((message) => message.id === options.editUserId);
        if (index === -1) {
          activeRef.current = false;
          return;
        }
        history = [
          ...messages.slice(0, index),
          { ...messages[index], content },
        ];
      } else if (options.resendUserId) {
        const index = messages.findIndex((message) => message.id === options.resendUserId);
        if (index === -1) {
          activeRef.current = false;
          return;
        }
        history = messages.slice(0, index + 1);
      } else {
        history = [
          ...messages,
          { id: createId(), role: "user", content, createdAt: now },
        ];
      }

      const nextHistory = [
        ...history,
        { id: assistantId, role: "assistant", content: "", createdAt: now },
      ];

      if (!chatId) {
        chatId = createId();
        setChats((current) => [
          {
            id: chatId,
            title: titleFromMessage(content),
            createdAt: now,
            updatedAt: now,
            messages: nextHistory,
          },
          ...current,
        ]);
        setActiveId(chatId);
      } else {
        patchChat(chatId, (chat) => ({
          ...chat,
          messages: nextHistory,
          updatedAt: now,
        }));
      }

      setDraft("");
      setIsStreaming(true);
      setActiveAssistantId(assistantId);
      stickRef.current = true;
      setStickToBottom(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const setAssistantContent = (text) =>
        patchChat(chatId, (chat) => ({
          ...chat,
          messages: chat.messages.map((message) =>
            message.id === assistantId ? { ...message, content: text } : message,
          ),
        }));

      const dropAssistant = () =>
        patchChat(chatId, (chat) => ({
          ...chat,
          messages: chat.messages.filter(
            (message) => message.id !== assistantId || message.content.length > 0,
          ),
        }));

      const setAssistantSources = (sources) =>
        patchChat(chatId, (chat) => ({
          ...chat,
          messages: chat.messages.map((message) =>
            message.id === assistantId ? { ...message, sources } : message,
          ),
        }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextHistory
              .slice(-8)
              .map(({ role, content: messageContent }) => ({
                role,
                content: messageContent,
              })),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let failure = null;
          try {
            failure = await response.json();
          } catch {
            failure = null;
          }
          dropAssistant();
          setErrorType(
            response.status === 429 || failure?.error === "rate_limited"
              ? "rate_limited"
              : "server_error",
          );
          return;
        }

        if (!response.body) throw new Error("missing_stream");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = "";
        let sentinelHandled = false;
        let sourcesPending = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          responseText += decoder.decode(value, { stream: true });

          // Strip the server-side "Searching…" sentinel (it is always byte 0).
          if (!sentinelHandled) {
            if (responseText.length >= SEARCH_SENTINEL.length) {
              if (responseText.startsWith(SEARCH_SENTINEL)) {
                responseText = responseText.slice(SEARCH_SENTINEL.length);
                setIsSearching(true);
                sourcesPending = true;
              }
              sentinelHandled = true;
            } else if (!SEARCH_SENTINEL.startsWith(responseText)) {
              sentinelHandled = true;
            } else {
              continue; // partial sentinel — wait for more bytes
            }
          }

          // After a search: one JSON line of [{title,link}] sources, then the answer.
          if (sourcesPending) {
            if (responseText.length === 0) {
              // Search sentinel just stripped — the sources line may still be
              // in flight (or search failed and content comes next). Keep waiting.
            } else if (responseText.startsWith(SOURCES_SENTINEL)) {
              const newline = responseText.indexOf("\n");
              if (newline === -1) continue; // wait for the full line
              try {
                const parsed = JSON.parse(
                  responseText.slice(SOURCES_SENTINEL.length, newline),
                );
                if (Array.isArray(parsed)) setAssistantSources(parsed);
              } catch {
                // Corrupt line — drop it, the answer still streams.
              }
              responseText = responseText.slice(newline + 1);
              sourcesPending = false;
            } else {
              sourcesPending = false; // search failed/skipped — no sources line
            }
          }

          if (responseText.length > 0) setIsSearching(false);
          setAssistantContent(responseText);

          // TTS: split off any sentences that just completed and queue them.
          if (speechOnRef.current) {
            const delta = responseText.slice(speechCursorRef.current);
            speechCursorRef.current = responseText.length;
            pendingSpeechRef.current += delta;
            const { sentences, rest } = extractSentences(pendingSpeechRef.current);
            pendingSpeechRef.current = rest;
            for (const sentence of sentences) speechQueue.enqueue(sentence);
          }
        }

        const remainder = decoder.decode();
        if (remainder) {
          responseText += remainder;
          setAssistantContent(responseText);
        }

        // Flush whatever is left as the final sentence(s).
        if (speechOnRef.current) {
          const delta = responseText.slice(speechCursorRef.current);
          pendingSpeechRef.current += delta;
          for (const sentence of flushSentences(pendingSpeechRef.current)) {
            speechQueue.enqueue(sentence);
          }
        }
        speechCursorRef.current = 0;
        pendingSpeechRef.current = "";
        setIsSearching(false);
      } catch (error) {
        stopSpeech();
        if (error?.name === "AbortError") {
          dropAssistant();
        } else {
          dropAssistant();
          setErrorType(error?.name === "TypeError" ? "network_error" : "server_error");
        }
      } finally {
        activeRef.current = false;
        abortRef.current = null;
        setIsStreaming(false);
        setActiveAssistantId(null);
        setIsSearching(false);
        patchChat(chatId, (chat) => ({ ...chat, updatedAt: Date.now() }));
      }
    },
    [activeId, messages, patchChat, stopSpeech],
  );

  const submitDraft = useCallback(() => {
    const editUserId = editTargetRef.current;
    void sendMessage(draft, editUserId ? { editUserId } : {});
  }, [draft, sendMessage]);

  const regenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (lastUser) void sendMessage(lastUser.content, { resendUserId: lastUser.id });
  }, [messages, sendMessage]);

  const editMessage = useCallback((message) => {
    editTargetRef.current = message.id;
    setDraft(message.content);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    stopSpeech();
    editTargetRef.current = null;
    setActiveId(null);
    setDraft("");
    setErrorType(null);
    setCopiedId(null);
    stickRef.current = true;
    setStickToBottom(true);
    if (isMobile()) setSidebarOpen(false);
  }, [stopSpeech]);

  const selectChat = useCallback((chatId) => {
    abortRef.current?.abort();
    stopSpeech();
    editTargetRef.current = null;
    setActiveId(chatId);
    setDraft("");
    setErrorType(null);
    setCopiedId(null);
    stickRef.current = true;
    setStickToBottom(true);
    if (isMobile()) setSidebarOpen(false);
  }, [stopSpeech]);

  const renameChat = useCallback(
    (chatId, title) => patchChat(chatId, (chat) => ({ ...chat, title })),
    [patchChat],
  );

  const deleteChat = useCallback(
    (chatId) => {
      if (chatId === activeId) {
        abortRef.current?.abort();
        stopSpeech();
      }
      setChats((current) => current.filter((chat) => chat.id !== chatId));
      if (chatId === activeId) {
        setActiveId(null);
        setErrorType(null);
      }
    },
    [activeId, stopSpeech],
  );

  const copyMessage = useCallback(async (message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
  }, []);

  const toggleSpeech = useCallback(() => {
    setSpeechOn((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(SPEECH_KEY, next ? "on" : "off");
      } catch {
        // Storage blocked — the toggle still works for this session.
      }
      if (!next) stopSpeech();
      return next;
    });
  }, [stopSpeech]);

  const lastAssistantId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chats}
        activeId={activeId}
        onSelect={selectChat}
        onNew={startNewChat}
        onRename={renameChat}
        onDelete={deleteChat}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 sm:px-4">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Sidebar toggle"
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
          >
            <IconSidebar />
          </button>
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--text)]">
            {activeChat ? null : (
              <span aria-hidden="true" className="shrink-0 text-[var(--accent)]">
                <Sparkle className="h-4 w-4" />
              </span>
            )}
            <span className="truncate">{activeChat?.title || APP_NAME}</span>
          </span>
          <button
            type="button"
            onClick={toggleSpeech}
            aria-pressed={speechOn}
            aria-label={speechOn ? "Awaz band karo" : "Awaz chalu karo"}
            title={speechOn ? "Awaz band karo" : "Awaz chalu karo"}
            className={`ml-auto rounded-lg p-2 transition-colors duration-150 hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${
              speechOn
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {speechOn ? <IconSpeaker /> : <IconSpeakerOff />}
          </button>
        </header>

        <main
          ref={mainRef}
          onScroll={handleScroll}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
          aria-live="polite"
        >
          <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col px-4 sm:px-6">
            {!hydrated ? (
              <div
                className="flex flex-1 items-center justify-center"
                role="status"
                aria-label="Chat load ho raha hai"
              >
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--surface-2)] border-t-[var(--accent)]" />
              </div>
            ) : showEmpty ? (
              <EmptyState
                onSuggestion={(suggestion) => void sendMessage(suggestion)}
                disabled={isStreaming}
              >
                <Composer
                  value={draft}
                  onChange={setDraft}
                  onSubmit={submitDraft}
                  onStop={() => abortRef.current?.abort()}
                  isStreaming={isStreaming}
                  textareaRef={textareaRef}
                />
              </EmptyState>
            ) : (
              <section className="flex flex-col gap-7 py-8 sm:gap-8">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={isStreaming}
                    isActiveAssistant={message.id === activeAssistantId}
                    isLastAssistant={message.id === lastAssistantId}
                    isSearching={isSearching && message.id === activeAssistantId}
                    copiedId={copiedId}
                    onCopy={copyMessage}
                    onRegenerate={regenerate}
                    onEdit={editMessage}
                  />
                ))}

                {errorType ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm"
                  >
                    <p className="text-[var(--text)]">{ERROR_MESSAGES[errorType]}</p>
                    <button
                      type="button"
                      onClick={regenerate}
                      className="mt-1.5 font-medium text-[var(--accent)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
                    >
                      Dobara try karo
                    </button>
                  </div>
                ) : null}

                {!stickToBottom ? (
                  <button
                    type="button"
                    onClick={scrollToBottom}
                    aria-label="Neeche scroll karo"
                    className="sticky bottom-4 mt-2 flex h-9 w-9 shrink-0 self-end items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-md transition-colors duration-150 hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    <IconArrowDown />
                  </button>
                ) : null}
              </section>
            )}
          </div>
        </main>

        {!showEmpty && hydrated ? (
          <footer className="shrink-0 border-t border-[var(--border)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <div className="mx-auto w-full max-w-[760px]">
              <Composer
                value={draft}
                onChange={setDraft}
                onSubmit={submitDraft}
                onStop={() => abortRef.current?.abort()}
                isStreaming={isStreaming}
                textareaRef={textareaRef}
              />
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
