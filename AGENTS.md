# AGENTS.md — AI Agent Instructions

This file defines rules, constraints, and conventions for any AI agent (Copilot, Claude, Cursor, etc.) working in this repository.

**Read this file before making any changes.**

---

## Project Identity

| Property       | Value                          |
|----------------|--------------------------------|
| Project        | React AI Chrome Extension      |
| Stack          | React, TypeScript, Vite, Chrome MV3 |
| Build output   | `dist/`                        |
| Design ref     | `DESIGN.md`                    |
| Task tracker   | `TASKS.md`                     |
| Requirements   | `REQUIREMENT.md`               |

---

## Mandatory Reading

Before doing any work, read:

1. `REQUIREMENT.md` — full product requirements
2. `ARCHITECTURE.md` — technical architecture, security model, and messaging constraints
3. `DESIGN.md` — visual, interaction, and accessibility rules
4. `TASKS.md` — current implementation phases and status

---

## What You May Do

- Implement tasks described in `TASKS.md`
- Create or edit files inside `src/`, `public/`, root config files (`manifest.json`, `vite.config.ts`, `tsconfig.json`, `package.json`)
- Write tests if a test framework is already configured
- Update `TASKS.md` task status as tasks are completed

## What You Must NOT Do

- ❌ Do **not** start a new phase until the previous one is verified
- ❌ Do **not** implement anything listed under "Out of scope for Phase 1" in `REQUIREMENT.md`
- ❌ Do **not** install packages without checking `package.json` first
- ❌ Do **not** use `console.log` (or any logger) in code paths that touch the API key
- ❌ Do **not** store the API key in `.env`, `VITE_*` env vars, source code, or Vite bundle
- ❌ Do **not** send the raw API key to the popup — only `{ configured: boolean }`
- ❌ Do **not** add broad permissions (`<all_urls>`, `tabs`, `webRequest`) to `manifest.json`
- ❌ Do **not** add client-side encryption of the API key (see DESIGN.md §8 — it provides no real security)
- ❌ Do **not** add a backend, database, authentication, or cloud storage
- ❌ Do **not** modify `REQUIREMENT.md`
- ❌ Do **not** generate code that is out of scope unless explicitly instructed

---

## Code Style & Conventions

### TypeScript
- Strict mode is on (`"strict": true` in `tsconfig.json`)
- Prefer `interface` over `type` for object shapes
- Use `type` for unions, primitives, and `AppErrorCode`
- Shared Chrome Extension message and domain types live in `src/shared/types.ts`

### React
- Functional components with hooks only — no class components
- Components must not import from `src/background/` or `src/providers/`
- No elaborate UI libraries (no MUI, no Ant Design, no Chakra) — plain CSS or Tailwind only

### File naming
- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts`, prefixed with `use`
- Providers: `kebab-case.ts`

### Chrome Extension
- All API key reads and AI requests must happen **inside the service worker** (`src/background/service-worker.ts`)
- The popup communicates with the service worker via `chrome.runtime.sendMessage` only
- Use the typed message contracts from `src/shared/types.ts` — do not create ad-hoc message objects
- Responses from the service worker must always be wrapped: `{ ok: true, data }` or `{ ok: false, error: AppError }`

### Error handling
- All provider HTTP errors must be mapped to `AppErrorCode` values defined in `src/types/index.ts`
- Never include raw AI provider error bodies in `AppError.message`
- User-facing error copy lives in the UI layer (see DESIGN.md §11)

---

## Security Rules (Non-negotiable)

1. **API key must never appear in any log, console, error message, or network request other than the Authorization header sent to the AI provider.**
2. **The raw API key must never be returned to the popup.** Only `{ configured: boolean }` is allowed.
3. **`chrome.storage.local` is the only permitted storage for the API key.** No cookies, no `localStorage`, no `sessionStorage`.
4. **The service worker must not store the API key in a module-level variable.** Read it from storage per request.
5. **CSP must be enforced** in `manifest.json` → no `unsafe-inline`, no remote scripts.

---

## Messaging Pattern

Always use the typed helpers from `src/messaging/messages.ts`.

```ts
// Correct — typed message
chrome.runtime.sendMessage({ type: 'ASK_AI', payload: { prompt } });

// Wrong — ad-hoc object, not typesafe
chrome.runtime.sendMessage({ action: 'ask', q: question });
```

Service worker response must always match:

```ts
type WorkerResponse<T> = { ok: true; data: T } | { ok: false; error: AppError };
```

---

## Build & Verification

After implementing a phase:

1. Run `npm run build` — must succeed with no TypeScript errors
2. Load `dist/` as unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked)
3. Manually verify the acceptance criteria listed in the relevant `TASKS.md` phase

---

## Adding a New AI Provider

1. Create `src/providers/<name>.ts`
2. Keep its exported input and result boundary provider-neutral
3. Map all HTTP error codes to `AppErrorCode`
4. Add the provider's API hostname to `host_permissions` in `manifest.json`
5. Do not expose provider-specific payloads to the popup

---

## Decisions Already Made

These must not be re-evaluated without explicit user approval:

| Decision                                | Rationale                                      |
|-----------------------------------------|------------------------------------------------|
| Service worker handles AI + key access  | Keeps sensitive ops out of popup renderer      |
| `chrome.storage.local` for key          | Extension-scoped, survives browser restart     |
| No key encryption                       | Would be security theater (see DESIGN.md §8)   |
| No backend                              | Phase 1 is BYOK / local only                   |
| Strict TypeScript                       | Prevents runtime surprises in extension context|
| No streaming in Phase 1                 | Keeps first implementation simple              |

---

## Out of Scope (Phase 1)

Do NOT implement:

- Authentication / accounts
- Conversation history / multi-turn chat
- Streaming responses
- Multiple simultaneous conversations
- Side panel mode
- Current page / selected text analysis
- RAG, agents, vector DB
- Cost / token display
- Retry / regenerate
- Copy response button
- Backend proxy
- Cloud storage / sync
- Model selector
