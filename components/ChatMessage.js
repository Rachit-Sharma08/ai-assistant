import MarkdownRenderer from "./MarkdownRenderer.js";
import { IconCheck, IconCopy, IconPencil, IconRegenerate, Sparkle } from "./icons.js";

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

function ThinkingIndicator() {
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
  copiedId,
  onCopy,
  onRegenerate,
  onEdit,
}) {
  if (message.role === "user") {
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-[var(--surface)] px-4 py-2.5 text-[15px] leading-[1.65] text-[var(--text)]">
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
          <ThinkingIndicator />
        ) : (
          <>
            <div className="assistant-text text-[var(--text)]">
              <MarkdownRenderer content={message.content} />
              {showCursor ? <span className="stream-cursor" aria-hidden="true" /> : null}
            </div>
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
