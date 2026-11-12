const STORAGE_KEY = "rachits-assistant-chats-v2";
const LEGACY_KEY = "rachits-assistant-conversation";

export function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function titleFromMessage(content) {
  const firstLine = String(content).trim().split("\n")[0];
  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}…` : firstLine || "Nayi chat";
}

function isMessage(message) {
  return (
    message &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function normalizeMessages(list) {
  return list
    .filter(isMessage)
    .map((message) => ({ ...message, id: message.id || createId() }));
}

function isChat(chat) {
  return (
    chat &&
    typeof chat.id === "string" &&
    typeof chat.title === "string" &&
    Array.isArray(chat.messages)
  );
}

// Old single-conversation format → one chat so nothing the user wrote is lost.
function migrateLegacy() {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const messages = normalizeMessages(parsed);
    if (messages.length === 0) return null;
    const now = Date.now();
    const firstUser = messages.find((message) => message.role === "user");
    return {
      id: createId(),
      title: firstUser ? titleFromMessage(firstUser.content) : "Nayi chat",
      createdAt: now,
      updatedAt: now,
      messages,
    };
  } catch {
    return null;
  }
}

export function loadChats() {
  const empty = { chats: [], activeId: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = migrateLegacy();
      if (migrated) {
        window.localStorage.removeItem(LEGACY_KEY);
        const state = { chats: [migrated], activeId: migrated.id };
        saveChats(state);
        return state;
      }
      return empty;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.chats)) return empty;
    const chats = parsed.chats
      .filter(isChat)
      .map((chat) => ({
        id: chat.id,
        title: chat.title,
        createdAt: typeof chat.createdAt === "number" ? chat.createdAt : Date.now(),
        updatedAt: typeof chat.updatedAt === "number" ? chat.updatedAt : Date.now(),
        messages: normalizeMessages(chat.messages),
      }))
      .filter((chat) => chat.messages.length > 0);
    const activeId =
      typeof parsed.activeId === "string" && chats.some((chat) => chat.id === parsed.activeId)
        ? parsed.activeId
        : null;
    return { chats, activeId };
  } catch {
    return empty;
  }
}

export function saveChats(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // Quota exceeded or storage blocked — chat keeps working in memory.
    return false;
  }
}

export function groupChats(chats) {
  const dayStart = (timestamp) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };
  const today = dayStart(Date.now());
  const day = 24 * 60 * 60 * 1000;
  const labels = [
    { label: "Today", min: today },
    { label: "Yesterday", min: today - day },
    { label: "Previous 7 days", min: today - 7 * day },
    { label: "Older", min: -Infinity },
  ];
  const groups = labels.map((entry) => ({ label: entry.label, chats: [] }));
  [...chats]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach((chat) => {
      const timestamp = chat.updatedAt || 0;
      const index = labels.findIndex((entry) => timestamp >= entry.min);
      groups[index].chats.push(chat);
    });
  return groups.filter((group) => group.chats.length > 0);
}
