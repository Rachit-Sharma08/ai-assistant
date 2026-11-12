import { SUGGESTIONS } from "../lib/config.js";
import { Sparkle } from "./icons.js";

export default function EmptyState({ onSuggestion, disabled, children }) {
  return (
    <section className="flex min-h-full flex-col items-center justify-center gap-9 py-14">
      <div className="flex flex-col items-center text-center">
        <span aria-hidden="true" className="text-[var(--accent)]">
          <Sparkle className="h-10 w-10" />
        </span>
        <h1 className="mt-5 text-2xl font-medium tracking-tight text-[var(--text)] sm:text-[2rem]">
          Namaste Rachit, aaj kya seekhna hai?
        </h1>
      </div>

      <div className="grid w-full max-w-xl gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestion(suggestion)}
            disabled={disabled}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-sm leading-snug text-[var(--text)] transition-colors duration-150 hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="w-full max-w-[680px]">{children}</div>
    </section>
  );
}
