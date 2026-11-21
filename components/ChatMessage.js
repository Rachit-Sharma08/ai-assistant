import { useEffect, useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer.js";
import Lightbox from "./Lightbox.js";
import { getImage } from "../lib/image-store.js";
import {
  IconCheck,
  IconCopy,
  IconPencil,
  IconRegenerate,
  IconSearch,
  Sparkle,
} from "./icons.js";

function ActionButton({ onClick, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
      {...props}
    >
      {props.children}
    </button>
  );
}

// Resolves image blobs from IndexedDB for display. Missing images degrade
// to a placeholder — chat loading never breaks.
function MessageImages({ images, onOpen }) {
  const [urls, setUrls] = useState(null);

  useEffect(() => {
    let alive = true;
    const objectUrls = [];
    (async () => {
      const resolved = [];
      for (const image of images) {
        const blob = await getImage(image.id);
        if (!alive) return;
        if (blob) {
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          resolved.push({ ...image, url });
        } else {
          resolved.push({ ...image, url: null });
        }
      }
      if (alive) setUrls(resolved);
    })();
    return () => {
      alive = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  if (urls === null) {
    return (
      <div className="mb-2 grid grid-cols-2 gap-1.5" aria-hidden="true">
        {images.slice(0, 4).map((image) => (
          <div
            key={image.id}
            className="h-24 animate-pulse rounded-xl bg-[var(--surface-2)]"
          />
        ))}
      </div>
    );
  }

  const columns =
    urls.length === 1 ? "grid-cols-1" : urls.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className={`mb-2 grid gap-1.5 ${columns}`} data-testid="message-images">
      {urls.map((image) =>
        image.url ? (
          <button
            key={image.id}
            type="button"
            onClick={() => onOpen(image.url)}
            aria-label="Photo badi karke dekho"
            className="overflow-hidden rounded-xl border border-[var(--border)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
          >
            <img
              src={image.url}
              alt="User ne bheji photo"
              className={`w-full object-cover ${urls.length === 1 ? "max-h-72" : "h-32"}`}
            />
          </button>
        ) : (
          <div
            key={image.id}
            className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-2 text-center text-[11px] text-[var(--text-muted)]"
          >
            Photo nahi mili
          </div>
        ),
      )}
    </div>
  );
}

function ThinkingIndicator({ searching }) {
  if (searching) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]" role="status">
        <IconSearch className="h-4 w-4 animate-pulse text-[var(--accent)]" />
        <span className="font-sans">Web par search kar raha hu…</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]" role="status">
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      </span>
      <span className="font-sans">Soch raha hu…</span>
    </div>
  );
}

export default function ChatMessage({
  message,
  isStreaming,
  isActiveAssistant,
  isLastAssistant,
  isSearching,
  copiedId,
  onCopy,
  onRegenerate,
  onEdit,
}) {
  const [lightboxUrl, setLightboxUrl] = useState(null);

  if (message.role === "user") {
    const hasImages = Array.isArray(message.images) && message.images.length > 0;
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-[var(--surface)] px-4 py-2.5 text-[15px] leading-[1.65] text-[var(--text)]">
          {hasImages ? (
            <MessageImages images={message.images} onOpen={setLightboxUrl} />
          ) : null}
          {message.content}
        </div>
        <button
          type="button"
          onClick={() => onEdit(message)}
          aria-label="Is message ko edit karo"
          className="msg-actions flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
        >
          <IconPencil className="h-3.5 w-3.5" />
          Edit
        </button>
        {lightboxUrl ? (
          <Lightbox
            src={lightboxUrl}
            alt="Bheji gayi photo"
            onClose={() => setLightboxUrl(null)}
          />
        ) : null}
      </div>
    );
  }

  const showThinking = isActiveAssistant && message.content.length === 0;
  const showCursor = isActiveAssistant && message.content.length > 0;

  return (
    <article className="group flex gap-3 sm:gap-3.5">
      <span
        aria-hidden="true"
        className="mt-1.5 shrink-0 text-[var(--accent)]"
      >
        <Sparkle className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        {showThinking ? (
          <ThinkingIndicator searching={isSearching} />
        ) : (
          <>
            <div className="assistant-text text-[var(--text)]">
              <MarkdownRenderer content={message.content} />
              {showCursor ? <span className="stream-cursor" aria-hidden="true" /> : null}
            </div>
            {Array.isArray(message.sources) && message.sources.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)]">Sources:</span>
                {message.sources.map((source) => (
                  <a
                    key={source.link}
                    href={source.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`Source: ${source.title || source.link}`}
                    className="max-w-[240px] truncate rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
                  >
                    {source.title || source.link}
                  </a>
                ))}
              </div>
            ) : null}
            {!isStreaming || !isActiveAssistant ? (
              <div className="msg-actions mt-1.5 flex items-center gap-0.5">
                <ActionButton
                  onClick={() => onCopy(message)}
                  aria-label={copiedId === message.id ? "Copy ho gaya" : "Message copy karo"}
                >
                  {copiedId === message.id ? (
                    <IconCheck className="h-3.5 w-3.5" />
                  ) : (
                    <IconCopy className="h-3.5 w-3.5" />
                  )}
                  {copiedId === message.id ? "Copied" : "Copy"}
                </ActionButton>
                {isLastAssistant ? (
                  <ActionButton
                    onClick={() => onRegenerate()}
                    aria-label="Jawab dobara generate karo"
                  >
                    <IconRegenerate className="h-3.5 w-3.5" />
                    Regenerate
                  </ActionButton>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
