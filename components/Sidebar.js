import { useEffect, useState } from "react";
import { APP_NAME } from "../lib/config.js";
import { groupChats } from "../lib/chat-store.js";
import { IconDots, IconMoon, IconPencil, IconPlus, IconSun, IconTrash, IconX, Sparkle } from "./icons.js";

export default function Sidebar({
  open,
  onClose,
  chats,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  theme,
  onToggleTheme,
}) {
  const [menuId, setMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");

  const groups = groupChats(chats);
  const stateClass =
    open === true ? " sidebar-open" : open === false ? " sidebar-closed" : "";

  useEffect(() => {
    if (menuId === null) return;
    function closeOnEscape(event) {
      if (event.key === "Escape") setMenuId(null);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuId]);

  function startRename(chat) {
    setMenuId(null);
    setRenamingId(chat.id);
    setRenameDraft(chat.title);
  }

  function commitRename() {
    const title = renameDraft.trim();
    if (title && renamingId) onRename(renamingId, title);
    setRenamingId(null);
  }

  return (
    <>
      {open === true ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-40 w-[264px] flex-col border-r border-[var(--border)] bg-[var(--bg)] lg:static lg:z-auto${stateClass}`}
        aria-label="Chat history sidebar"
      >
        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <span aria-hidden="true" className="shrink-0 text-[var(--accent)]">
              <Sparkle className="h-4 w-4" />
            </span>
            <span className="truncate">{APP_NAME}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sidebar band karo"
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] lg:hidden"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2 pt-2">
          <button
            type="button"
            onClick={onNew}
            className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium text-[var(--text)] transition-colors duration-150 hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <IconPlus />
            Nayi chat
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {groups.length === 0 ? (
            <p className="px-2 py-4 text-xs text-[var(--text-muted)]">
              Abhi tak koi chat nahi hai.
            </p>
          ) : null}
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <h2 className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {group.label}
              </h2>
              <ul className="space-y-0.5">
                {group.chats.map((chat) => (
                  <li key={chat.id} className="group relative">
                    {renamingId === chat.id ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") commitRename();
                          if (event.key === "Escape") setRenamingId(null);
                        }}
                        aria-label="Chat ka naam badlo"
                        className="w-full rounded-lg border border-[var(--accent)] bg-[var(--surface)] px-2.5 py-2 text-sm text-[var(--text)] outline-none"
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelect(chat.id)}
                          className={`flex w-full items-center truncate rounded-lg px-2.5 py-2 pr-8 text-left text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${
                            chat.id === activeId
                              ? "bg-[var(--surface-2)] text-[var(--text)]"
                              : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                          }`}
                        >
                          <span className="truncate">{chat.title}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuId(menuId === chat.id ? null : chat.id)}
                          aria-label={`${chat.title} ke options`}
                          aria-haspopup="menu"
                          aria-expanded={menuId === chat.id}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--text-muted)] opacity-0 transition duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <IconDots className="h-4 w-4" />
                        </button>
                        {menuId === chat.id ? (
                          <>
                            <div
                              className="fixed inset-0 z-[5]"
                              onClick={() => setMenuId(null)}
                              aria-hidden="true"
                            />
                            <div
                              role="menu"
                              className="absolute right-1 top-8 z-10 w-32 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => startRename(chat)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
                              >
                                <IconPencil className="h-3.5 w-3.5" />
                                Rename
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenuId(null);
                                  if (window.confirm("Ye chat delete karni hai?")) {
                                    onDelete(chat.id);
                                  }
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--danger)] transition-colors hover:bg-[var(--surface-2)]"
                              >
                                <IconTrash className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </>
                        ) : null}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Light theme on karo" : "Dark theme on karo"}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
          >
            {theme === "dark" ? <IconSun /> : <IconMoon />}
            {theme === "dark" ? "Light theme" : "Dark theme"}
          </button>
        </div>
      </aside>
    </>
  );
}
