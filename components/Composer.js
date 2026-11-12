import { useEffect, useRef } from "react";
import { IconSend, IconStop } from "./icons.js";

const MAX_ROWS = 8;

export default function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  textareaRef,
}) {
  const touchRef = useRef(false);

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

  return (
    <div className="w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="composer-box flex items-end gap-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-2"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Kuch bhi pucho..."
          aria-label="Message"
          className="max-h-[192px] min-h-[44px] min-w-0 flex-1 resize-none overflow-y-hidden bg-transparent px-3 py-2.5 text-[15px] leading-[1.6] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
        />
        <button
          type={isStreaming ? "button" : "submit"}
          onClick={isStreaming ? onStop : undefined}
          disabled={!isStreaming && !value.trim()}
          aria-label={isStreaming ? "Generation rok do" : "Message bhejo"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:text-[var(--text-muted)]"
        >
          {isStreaming ? <IconStop className="h-3.5 w-3.5" /> : <IconSend />}
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
        AI galti kar sakta hai. Zaroori baaton ko verify karo.
      </p>
    </div>
  );
}
