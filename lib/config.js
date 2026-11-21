export const APP_NAME = "Rachit's Assistant";

// Model names live in one place — change them here (env vars still override).
export const DEFAULT_MODEL = "openai/gpt-oss-120b";
export const FALLBACK_MODEL = "openai/gpt-oss-20b";

// Vision-capable Groq model (image input). Llama 4 models are gone from
// Groq; qwen3.8-27b is the current multimodal one (max 3 images/request).
export const DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b";

// Groq speech-to-text (OpenAI-compatible /audio/transcriptions).
export const DEFAULT_STT_MODEL = "whisper-large-v3-turbo";

// Bias Whisper toward Hinglish in Roman script (Devanagari still accepted).
export const STT_PROMPT =
  "Yeh Hinglish (Roman script Hindi-English mix) me bola gaya speech hai. Transcript usi Hinglish (Roman) me likho, jaise log bolte hain. Agar Devanagari Hindi me ho to wahi rakhho. Words alag-alag mat jodo.";

// Max images per message — Groq qwen3.8-27b allows 3 per request.
export const MAX_IMAGES_PER_MESSAGE = 3;

// Newest-first budget: only this many images travel per /api/chat request.
// Older image messages get IMAGE_PLACEHOLDER text instead (token + size).
export const MAX_REQUEST_IMAGES = 3;
export const IMAGE_PLACEHOLDER = "[user ne pehle ek photo bheji thi]";

// Appended to the system prompt while voice mode is open.
export const VOICE_MODE_HINT =
  "Voice mode is ON: reply like short spoken conversation — 1 to 3 sentences, plain Hinglish, no Markdown, no bullet lists, no emojis.";

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

// Shown under the composer when photos are attached (click fills the draft).
export const IMAGE_CHIPS = [
  "Is ad creative ko review karo",
  "Is Instagram post ko improve karo",
  "Is screenshot me kya galat hai?",
];

// Used when the user sends photos with no text.
export const DEFAULT_IMAGE_PROMPT =
  "Is image me kya hai? Simple Hinglish me samjhao.";

export const SYSTEM_PROMPT =
  "You are Rachit's friendly digital marketing tutor. Rachit is a student learning digital marketing with AI. Teach every topic simply: clear explanations, short real-world examples, and short actionable steps. Reply in simple Hinglish by default; if the user writes in Hindi or English, mirror their language. Keep answers short by default (under about 250 words) unless the user asks for detail, and use Markdown when it helps. For marketing topics (social media, SEO, ads, content, email, branding, analytics) give ready-to-use, actionable output. If you are not sure, say so honestly - never invent facts or statistics. When the user needs current or recent information (news, prices, trends, scores, anything time-sensitive), call the web_search tool instead of guessing. Only share links that came back in the search results - never invent URLs.";
