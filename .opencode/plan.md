# Plan — Voice + Image upload session (2026-11-21)

Goal: Feature A (voice input, voice mode, TTS controls) + Feature B (image upload + vision),
then build, Playwright QA, Vercel env sync, deploy, prod tests.

## Phase 0 — Audit (done)
- Stack: Next.js App Router (JS), Tailwind 3.4, pnpm, Vercel. Streaming chat in app/page.js,
  Composer/ChatMessage/Sidebar components, /api/chat (Groq + SerpAPI tool call), /api/tts
  (Cartesia) + lib/speech-queue.js, localStorage chats (lib/chat-store.js).
- Env NAMES: GROQ_API_KEY, GROQ_MODEL, GROQ_FALLBACK_MODEL, GITHUB_TOKEN, VERCEL_TOKEN,
  SERPAPI_API_KEY, CARTESIA_API_KEY, CARTESIA_VOICE_ID. .gitignore covers .env* ✓.
- Groq models verified live via GET /openai/v1/models (key from .env, value never printed):
  - STT: whisper-large-v3-turbo (also whisper-large-v3). prompt param supported (224 tok).
  - Vision: qwen/qwen3.8-27b (multimodal, tool use supported, MAX 3 images/request, 20MB).
    Llama 4 Scout/Maverick GONE from Groq. muse-spark-open = limited preview (skip).
  - Chat text: openai/gpt-oss-120b / gpt-oss-20b (current, keep).
- Git: main clean; repo-local identity set to 339157645+Rachit-Sharma08@users.noreply.github.com.

## Build order (one commit each, project working after each)
1. chore: vision/STT model defaults in lib/config.js + .env.example names
2. feat: /api/stt route (Groq whisper, Hinglish prompt, 4MB cap, friendly errors)
3. feat: lib/image-compress.js + lib/image-store.js (IndexedDB) + lib/recorder.js
4. feat: /api/chat multimodal content + vision model routing + older-image placeholder
5. feat: image upload end-to-end (attach button, compress, paste/drop, send, display grid)
6. feat: lightbox + chat-delete image cleanup + missing-image tolerance
7. feat: mic recording in composer (timer/cancel/stop, auto-send toggle, Web Speech fallback)
8. feat: voice mode overlay (orb, silence detect loop, interrupt, voice prompt hint)
9. feat: per-message Suno button + Auto-speak replies toggle in sidebar
Push every 2-3 commits.

## Verify
- pnpm build green.
- Playwright QA: image file-input/paste/drop, preview+remove, send, lightbox, refresh
  persistence, mic UI (fake media stream flags), voice overlay open/close/states (mock /api/stt),
  375px mobile, light/dark, streaming/stop/new chat/search regressions.
- Local /api/chat with tiny real image → streamed vision answer.

## Deploy
- vercel whoami → env ls compare → add missing NAMES (values piped from .env, never printed)
  → push main (auto-deploy) → prod tests (/, chat text, chat image, stt error shape, search
  sources, tts audio).

## Key decisions (made autonomously)
- Max 3 images/message (Groq qwen3.8-27b limit is the lower number vs 4 asked).
- Vision turns skip web search (no tools round) — avoids tool+image failure path.
- Client sends image data only for 3 newest images in window; older become text placeholder;
  server applies same rule as defense.
- Voice mode forces speech queue ON via ref (independent of auto-speak toggle).
