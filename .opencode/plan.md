# Plan: Claude-style UI redesign for Rachit's Assistant

Goal: Redesign the chat UI to closely resemble Claude.ai (warm, minimal, calm),
add multi-chat history, themes, markdown highlighting, and ship via git + Vercel.

## Current state (Step 0 findings)
- Framework: Next.js (app router, JS), Tailwind 3.4, pnpm workspace (root = web app)
- Groq called server-side in `app/api/chat/route.js` (streams text/plain) — key NOT in client ✓
- Persistence: single conversation in localStorage key `rachits-assistant-conversation`
- Git: main branch, remote https://github.com/Rachit-Sharma08/ai-assistant.git, clean tree
- Vercel: no local `.vercel` link; CLI v63 installed; live at ai-assistant-one-teal.vercel.app
- No `.env` locally; `.gitignore` covers `.env*` ✓

## Steps & owners (all executed in this session, single author — components are
tightly coupled, delegation would cost coherence)
1. Deps: add `rehype-highlight` (syntax highlighting) — package.json + lockfile
2. Design tokens + themes in `app/globals.css`; fonts + theme-boot script in `app/layout.js`
3. `lib/config.js`: model constants, Hinglish suggestions, DM-tutor system prompt
4. `lib/chat-store.js`: multi-chat localStorage persistence + old-key migration
5. Components: Sidebar, ChatMessage, MarkdownRenderer, Composer, EmptyState, icons
6. `app/page.js`: orchestration (multi-chat, streaming, stop, edit/resend, regenerate,
   smart auto-scroll, drawer, errors)
7. API route: model names from config constants (env override kept)
8. Verify: `pnpm install`, `pnpm build`, dev-server sanity + E2E (if key pullable),
   screenshots at 375/768/1440, impeccable detect pass
9. Git: 5-6 small logical commits → push origin main
10. Vercel: link project, verify GROQ_API_KEY, deploy (auto on push or `vercel --prod`),
    curl production URL + /api/chat smoke test

## Done criteria
- Production build passes; main flow works (send/stop/new chat/history/theme)
- Pushed to GitHub main; Vercel deployment successful; live URL returns 200;
  /api/chat responds (not 500 on valid request)
- No secrets in repo; final summary lists any manual actions (e.g. key rotation)
