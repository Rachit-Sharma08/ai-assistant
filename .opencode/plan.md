# Plan — Rachit's Assistant: audit → fix → verify → deploy (2026-11-21)

Goal: audit current state, finish missing spec items, build, verify, commit, push, deploy to Vercel.

## Phase 1 — Audit (done)
- Stack: Next.js App Router (JS), Tailwind 3.4, pnpm, Vercel. Fonts: Inter + Source Serif 4.
- Git: main, clean history, 17 commits. Uncommitted work from previous session: SERP web-search
  tool-calling in /api/chat, Cartesia TTS /api/tts + speech queue + header speaker toggle.
- Env NAMES in .env: GROQ_API_KEY, GROQ_MODEL, GROQ_FALLBACK_MODEL, GITHUB_TOKEN, VERCEL_TOKEN,
  SERPAPI_API_KEY, CARTESIA_API_KEY, CARTESIA_VOICE_ID.
- Secrets: .env NEVER committed; no key patterns in git history. .gitignore covers .env*.
- Keys used only server-side (app/api/* routes + lib/search.js). No client-side key usage.
- UI spec: ~95% already implemented (themes, sidebar, history groups, composer, markdown+code
  blocks, streaming, errors, empty state, persistence, accessibility).

## Phase 2 — Missing pieces (this session)
1. [x] Set local git user.email to rachitsharma9990888@gmail.com (user request; local only).
2. [ ] Sources chips: server sends `SOURCES_SENTINEL + JSON line` after search; client parses,
   stores `message.sources`, ChatMessage renders link chips under answer.
   Files: lib/config.js, app/api/chat/route.js, app/page.js, components/ChatMessage.js
3. [ ] Search status text → Hinglish "Web par search kar raha hu..." (components/ChatMessage.js).
4. [ ] Commit uncommitted previous-session work (search + TTS) in logical commits.

## Phase 3 — Verify
- pnpm install (if needed), `pnpm build` — fix real errors.
- Dev server smoke test: message, streaming, stop, new chat, history, theme, web search.

## Phase 4 — Git + Deploy
- Conventional commits, push origin main every 2-3 commits.
- Vercel: use VERCEL_TOKEN from .env (never print). Compare env names, add missing
  (GROQ_API_KEY, SERPAPI_API_KEY, CARTESIA_*, GROQ_MODEL…), redeploy, curl prod URL,
  test /api/chat stream (expect 200, not 500).

Done-criteria: build green, prod URL 200, /api/chat streams a real answer, all spec gaps closed.
