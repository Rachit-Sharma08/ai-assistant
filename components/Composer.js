import { useEffect, useRef, useState } from "react";
import { IMAGE_CHIPS, MAX_IMAGES_PER_MESSAGE } from "../lib/config.js";
import { IconCheck, IconMic, IconPaperclip, IconSend, IconStop, IconX } from "./icons.js";

const MAX_ROWS = 8;

function formatElapsed(ms) {
  const total = Math.floor((ms || 0) / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Thumbnail that owns its object URL (created on mount, revoked on unmount).
function Thumb({ attachment, onRemove }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!attachment.blob) {
      setUrl(null);
      return undefined;
    }
    const next = URL.createObjectURL(attachment.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [attachment.blob]);

  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
      {url ? (
        <img
          src={url}
          alt="Attach ki gayi photo"
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center"
          role="status"
          aria-label="Photo taiyar ho rahi hai"
        >
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--surface)] border-t-[var(--accent)]" />
        </span>
      )}
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        aria-label="Ye photo hatao"
        className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-1 text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
      >
        <IconX className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  textareaRef,
  images = [],
  onAddImages,
  onRemoveImage,
  imageError,
  recording = null,
  sttBusy = false,
  micAvailable = false,
  micError = null,
  micRetry = false,
  autoSend = false,
  onToggleAutoSend,
  onMicStart,
  onMicStop,
  onMicCancel,
  onMicRetry,
}) {
  const touchRef = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    touchRef.current = window.matchMedia("(pointer: coarse)").matches;
  }, []);

  // Auto-grow from 1 row up to MAX_ROWS, then scroll.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight);
    const maxHeight = (lineHeight || 24) * MAX_ROWS;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, textareaRef]);

  function handleKeyDown(event) {
    // Desktop: Enter sends, Shift+Enter breaks the line. Touch: Enter = newline.
    if (event.key === "Enter" && !event.shiftKey && !touchRef.current) {
      event.preventDefault();
      onSubmit();
    }
  }

  function handlePaste(event) {
    if (!onAddImages) return;
    const files = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (files.length > 0) {
      event.preventDefault();
      onAddImages(files);
    }
  }

  const canSend =
    !isStreaming && (value.trim().length > 0 || images.some((image) => image.status === "ready"));
  const showChips =
    onAddImages &&
    images.length > 0 &&
    !value.trim() &&
    images.every((image) => image.status === "ready");

  return (
    <div className="w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="composer-box rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-2"
      >
        {recording || sttBusy ? (
          <div
            className="mb-2 flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            data-testid="recording-bar"
          >
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                sttBusy
                  ? "animate-pulse bg-[var(--text-muted)]"
                  : "animate-pulse bg-[var(--danger)]"
              }`}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]" role="status">
              {sttBusy
                ? "Sun ke likh raha hu..."
                : `Record ho raha hu... ${formatElapsed(recording?.elapsedMs)}`}
            </span>
            {!sttBusy ? (
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={onMicCancel}
                  aria-label="Recording cancel karo"
                  className="rounded-full p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
                >
                  <IconX className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onMicStop}
                  aria-label="Recording rok kar bhejo"
                  className="rounded-full bg-[var(--accent)] p-2 text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
                >
                  <IconCheck className="h-4 w-4" />
                </button>
              </span>
            ) : null}
          </div>
        ) : null}

        {images.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2 px-1" data-testid="attachment-previews">
            {images.map((attachment) => (
              <Thumb
                key={attachment.id}
                attachment={attachment}
                onRemove={onRemoveImage}
              />
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          {onAddImages ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                hidden
                onChange={(event) => {
                  onAddImages(Array.from(event.target.files || []));
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Photo attach karo"
                title={`Photo attach karo (max ${MAX_IMAGES_PER_MESSAGE})`}
                disabled={images.length >= MAX_IMAGES_PER_MESSAGE}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconPaperclip />
              </button>
            </>
          ) : null}

          {onMicStart && micAvailable ? (
            <button
              type="button"
              onClick={recording ? onMicStop : onMicStart}
              disabled={sttBusy}
              aria-label={recording ? "Recording rok do" : "Awaaz se likho"}
              title="Awaaz se message likho"
              data-testid="mic-button"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
                recording
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              }`}
            >
              <IconMic />
            </button>
          ) : null}

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Kuch bhi pucho..."
            aria-label="Message"
            className="max-h-[192px] min-h-[44px] min-w-0 flex-1 resize-none overflow-y-hidden bg-transparent px-3 py-2.5 text-[15px] leading-[1.6] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button
            type={isStreaming ? "button" : "submit"}
            onClick={isStreaming ? onStop : undefined}
            disabled={!canSend}
            aria-label={isStreaming ? "Generation rok do" : "Message bhejo"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:text-[var(--text-muted)]"
          >
            {isStreaming ? <IconStop className="h-3.5 w-3.5" /> : <IconSend />}
          </button>
        </div>
      </form>

      {showChips ? (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="image-chips">
          {IMAGE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChange(chip)}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      {imageError ? (
        <p role="alert" className="mt-2 text-center text-xs text-[var(--danger)]">
          {imageError}
        </p>
      ) : null}

      {micError ? (
        <p role="alert" className="mt-2 text-center text-xs text-[var(--danger)]">
          {micError}
          {micRetry && onMicRetry ? (
            <>
              {" "}
              <button
                type="button"
                onClick={onMicRetry}
                className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
              >
                Dobara try karo
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      {micAvailable && onToggleAutoSend ? (
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={autoSend}
            onChange={onToggleAutoSend}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
            data-testid="auto-send-toggle"
          />
          Bolne ke baad auto-send
        </label>
      ) : null}

      <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
        AI galti kar sakta hai. Zaroori baaton ko verify karo.
      </p>
    </div>
  );
}
