# PRODUCT.md — Rachit's Assistant

## What this is
A personal AI chat assistant for Rachit, a student learning digital marketing (with AI).
It answers questions in Hindi/Hinglish/English with ready-to-use, actionable output
(content plans, SEO basics, ad explanations, email tips).

## Audience & scene
- Primary user: Rachit himself, on phone and laptop, casual self-study sessions.
- Language: UI copy stays Hinglish (Hindi in Latin script). Model replies match the
  user's language, defaulting to simple Hinglish.

## Mechanism
- Next.js app-router web app; Groq LLM streamed through a server-side route
  (`/api/chat`) so the API key never reaches the client.
- Multi-chat history persisted in localStorage (titles auto-generated from the
  first user message), grouped by day in a sidebar.

## Product truth / constraints (must not change)
- Groq API key stays server-side only; model names configurable via env with
  constants in `lib/config.js`.
- Persistence: localStorage only (no backend DB).
- Deploy target: Vercel, live at https://ai-assistant-one-teal.vercel.app/.
- Existing features kept: streaming with Stop, retry on error, new chat,
  markdown answers, suggestions on empty state, footer disclaimer.
- Honest assistant: never invents facts/links/stats; admits no live internet.

## Standing brand commitments
- Visual world: Claude.ai-like — warm dark theme default (#262624) with light
  theme (#FAF9F5), terracotta accent #D97757, serif assistant messages,
  minimal calm Operate-surface UI. Pinned by the owner's brief (2026-11-12).
