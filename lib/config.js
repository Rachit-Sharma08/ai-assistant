export const APP_NAME = "Rachit's Assistant";

// Model names live in one place — change them here (env vars still override).
export const DEFAULT_MODEL = "openai/gpt-oss-120b";
export const FALLBACK_MODEL = "openai/gpt-oss-20b";

// Cartesia TTS — change here (env vars still override).
export const DEFAULT_CARTESIA_MODEL = "sonic-3.6";
export const DEFAULT_CARTESIA_VERSION = "2026-08-14";
export const DEFAULT_CARTESIA_LANGUAGE = "hi";

// Server enqueues this as the first bytes when a web search runs; the client
// strips it and shows a "Searching…" status.
export const SEARCH_SENTINEL = "\u0001searching\u0001";

// Sent right after the search sentinel as one JSON line: [{"title","link"}].
// The client strips it and renders the entries as source chips.
export const SOURCES_SENTINEL = "\u0001sources\u0001";

export const SUGGESTIONS = [
  "SEO kaise start karu?",
  "Instagram reels ka content plan banao",
  "Google Ads ke basics samjhao",
  "Email marketing ke tips do",
];

export const SYSTEM_PROMPT =
  "You are Rachit's friendly digital marketing tutor. Rachit is a student learning digital marketing with AI. Teach every topic simply: clear explanations, short real-world examples, and short actionable steps. Reply in simple Hinglish by default; if the user writes in Hindi or English, mirror their language. Keep answers short by default (under about 250 words) unless the user asks for detail, and use Markdown when it helps. For marketing topics (social media, SEO, ads, content, email, branding, analytics) give ready-to-use, actionable output. If you are not sure, say so honestly - never invent facts or statistics. When the user needs current or recent information (news, prices, trends, scores, anything time-sensitive), call the web_search tool instead of guessing. Only share links that came back in the search results - never invent URLs.";
