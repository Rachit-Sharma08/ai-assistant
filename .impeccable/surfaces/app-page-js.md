---
version: 1
slug: "app-page-js"
primary_target: "app/page.js"
related_targets: []
---

# Surface brief — app/page.js (main chat surface)

Scope: primary chat screen of Rachit's Assistant (Operate mode). Audience: Rachit,
student of digital marketing, phone + laptop self-study. Job: ask anything, get
Hinglish answers, find past chats fast. Constraints: localStorage persistence,
server-side Groq streaming, Hinglish UI copy, existing features preserved.

## Direction contract

THESIS: The conversation itself is the product — assistant answers in warm serif
prose straight on a warm dark ground, no avatar bubbles, no chrome; this refuses
the incumbent generic indigo-on-white chat template with gradient avatars.

OWN-WORLD: Warm dark ground #262624 (light theme #FAF9F5), surfaces #30302E /
#3A3A37, hairline borders rgba(255,255,255,0.08), text #ECECEC / muted #9C9A92,
one terracotta accent #D97757 carrying send button, focus rings, sparkle logo and
active states. Inter (system-ui fallback) for UI chrome; Source Serif 4 (Georgia
fallback) 16-17px / 1.7 for assistant prose. Radii 12-16px cards, 24px composer,
no heavy shadows, no gradients, 150-200ms transitions, hairline borders only.

STORY: Rachit lands on a calm empty state — orange sparkle, "Namaste Rachit, aaj
kya seekhna hai?", four digital-marketing chips — asks, watches serif tokens
stream in with a blinking caret, stops/retries/edits as needed, and finds every
past chat waiting in a day-grouped sidebar on his next visit.

FIRST VIEWPORT: 100dvh shell — slim header (sidebar toggle + truncated chat
title) above a centered max-w-760px column; 264px left sidebar (New chat button,
Today / Yesterday / Previous 7 days / Older grouped history with hover
rename+delete menu, theme toggle pinned at bottom), slide-over drawer with
overlay below lg. Empty state: vertically centered greeting, chips, composer
beneath. Active chat: right-aligned user bubbles (max 80%), full-width serif
assistant text with sparkle lead, action icons on hover, composer docked at the
bottom over the muted disclaimer line.

FORM: single-screen chat application shell with collapsible sidebar (the only
structure considered for this surface); seed: none (unavailable).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
