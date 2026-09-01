# TASKS.md — MVP Implementation Plan

**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` complete · `[!]` blocked

**Implementation gate:** This plan is for review only. Do not begin a phase until the preceding phase has been verified and approved.

**Authoritative references:**

1. `AGENTS.md` — repository rules and security constraints
2. `ARCHITECTURE.md` — technical architecture and MVP scope
3. `DESIGN.md` — visual, interaction, and accessibility rules
4. `REQUIREMENT.md` — original product requirements

---

## Phase 0 — Align Planning Documents `[x]`

**Goal:** Remove conflicts between the agent guidance and the newer architecture before source code exists.

### Tasks

- [ ] Update `AGENTS.md` mandatory reading order to include `ARCHITECTURE.md`.
- [ ] Make `AGENTS.md` refer to `ARCHITECTURE.md` for technical decisions and `DESIGN.md` for UI decisions.
- [ ] Align the messaging examples in `AGENTS.md` with the approved MVP message names:
  - `ASK_AI`
  - `SAVE_API_KEY`
  - `REMOVE_API_KEY`
  - `GET_SETTINGS_STATUS`
- [ ] Align `AGENTS.md` file-location guidance with the lean MVP structure:
  - shared contracts in `src/shared/types.ts`
  - provider implementation in `src/providers/openai.ts`
  - message handling in `src/background/service-worker.ts`
- [ ] Retain all existing non-negotiable security rules.

### Files Likely Affected

- `AGENTS.md`
- `README.md` if its architecture/file tree differs from `ARCHITECTURE.md`

### Verification

- No contradiction remains between `AGENTS.md`, `ARCHITECTURE.md`, and `DESIGN.md`.
- The plan does not introduce an unnecessary services, messaging, or provider-registry layer.

---

## Phase 1 — Create the Extension Skeleton `[x]`

**Goal:** Establish a strict TypeScript React/Vite Chrome Manifest V3 project that builds to a loadable `dist/` directory.

### Tasks

- [ ] Inspect `package.json` before installing or changing dependencies.
- [ ] Create the React + TypeScript + Vite project configuration.
- [ ] Add a root `manifest.json` with:
  - Manifest version 3
  - Popup action pointing to `index.html`
  - Module background service worker built to `background/service-worker.js`
  - Only the `storage` permission
  - A narrow OpenAI host permission, `https://api.openai.com/*`
  - Extension-page CSP allowing scripts only from the extension itself
- [ ] Configure Vite to emit:
  - popup assets and `index.html` to `dist/`
  - service worker to `dist/background/service-worker.js`
  - static manifest assets required by Chrome
- [ ] Add the popup entry point at `src/popup/main.tsx`.
- [ ] Add a minimal `src/popup/App.tsx` that renders the popup shell.
- [ ] Add an initially empty `src/background/service-worker.ts`.
- [ ] Set strict TypeScript compiler options appropriate for browser and Chrome extension APIs.

### Files Likely Affected

- `package.json`
- `package-lock.json` or the existing package-manager lockfile
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `manifest.json`
- `src/popup/main.tsx`
- `src/popup/App.tsx`
- `src/background/service-worker.ts`

### Verification

- `npm run build` completes successfully.
- `dist/` contains the popup entry point, manifest, and background worker.
- Chrome loads `dist/` as an unpacked extension without extension-page errors.
- Opening the toolbar action displays the placeholder popup.

---

## Phase 2 — Define Safe Shared Contracts `[x]`

**Goal:** Establish the small, provider-neutral contract between popup, service worker, and provider module.

### Tasks

- [ ] Create `src/shared/types.ts`.
- [ ] Define a discriminated popup-to-worker message union:
  - `ASK_AI` with a text prompt
  - `SAVE_API_KEY` with a newly entered key
  - `REMOVE_API_KEY`
  - `GET_SETTINGS_STATUS`
- [ ] Define serializable successful-response shapes without provider-specific fields.
- [ ] Define `AppErrorCode`:
  - `MISSING_API_KEY`
  - `INVALID_API_KEY`
  - `RATE_LIMITED`
  - `NETWORK_ERROR`
  - `PROVIDER_ERROR`
  - `INVALID_REQUEST`
  - `UNKNOWN_ERROR`
- [ ] Define a safe `AppError` and `WorkerResponse<T>` discriminated union.
- [ ] Define the minimal internal OpenAI boundary:
  - `AskInput` containing `prompt`
  - `AskResult` containing `content`
- [ ] Add message and payload guards in the service worker so malformed runtime messages return `INVALID_REQUEST`.

### Files Likely Affected

- `src/shared/types.ts`
- `src/background/service-worker.ts`

### Verification

- TypeScript rejects malformed internal message and response usage.
- The popup-facing contract contains no API key in any response shape.
- Provider request/response payload types are not exposed outside `src/providers/`.

---

## Phase 3 — Implement Credential Storage in the Service Worker `[x]`

**Goal:** Safely save, replace, check, and remove a BYOK API key without exposing a persisted key to React.

### Tasks

- [ ] Centralize typed `chrome.storage.local` access within `src/background/service-worker.ts` or a narrowly scoped internal helper if one proves necessary.
- [ ] Handle `SAVE_API_KEY`:
  - trim and reject an empty key
  - persist it in `chrome.storage.local`
  - return only `{ apiKeyConfigured: true, provider: "openai" }`
- [ ] Handle `GET_SETTINGS_STATUS`:
  - inspect storage
  - return configuration status only
  - never return the stored key or a masked derivative
- [ ] Handle `REMOVE_API_KEY`:
  - remove the key from `chrome.storage.local`
  - return `{ apiKeyConfigured: false, provider: "openai" }`
- [ ] Ensure the key is never assigned to module-level worker state.
- [ ] Ensure no logging or error construction includes a key, authorization header, or storage contents.

### Files Likely Affected

- `src/background/service-worker.ts`
- `src/shared/types.ts`

### Verification

- Saving, reopening the popup, replacing, and removing a key produce the expected status.
- The persisted key is never returned by a runtime message.
- The worker reads the key from storage only when required.

---

## Phase 4 — Add the OpenAI Provider Module `[x]`

**Goal:** Implement the MVP provider boundary and safe OpenAI request handling.

### Tasks

- [ ] Create `src/providers/openai.ts`.
- [ ] Implement an `askOpenAI(apiKey, input)` function using the approved minimal `AskInput` / `AskResult` boundary.
- [ ] Use HTTPS `fetch` to call the OpenAI API from the service worker.
- [ ] Send the API key exclusively in the `Authorization: Bearer` header.
- [ ] Set the approved MVP model in the provider module rather than in React.
- [ ] Parse only the assistant text needed by the popup.
- [ ] Map failures to safe internal errors:
  - `401` / `403` → `INVALID_API_KEY`
  - `429` → `RATE_LIMITED`
  - `5xx` → `PROVIDER_ERROR`
  - fetch/network failure → `NETWORK_ERROR`
  - unexpected response shape or remaining errors → `UNKNOWN_ERROR`
- [ ] Do not include raw provider response bodies, headers, API keys, or authorization values in returned errors.

### Files Likely Affected

- `src/providers/openai.ts`
- `src/shared/types.ts`

### Verification

- A controlled successful provider response maps to `AskResult.content`.
- Each HTTP/network failure maps to the intended safe error category.
- No provider-specific response object crosses into popup-facing contracts.

---

## Phase 5 — Wire Ask Requests Through the Service Worker `[x]`

**Goal:** Complete the secure popup → service worker → OpenAI → popup request path.

### Tasks

- [ ] Add the `ASK_AI` handler to `src/background/service-worker.ts`.
- [ ] Validate the prompt and reject empty or whitespace-only input with `INVALID_REQUEST`.
- [ ] Read the persisted API key per request.
- [ ] Return `MISSING_API_KEY` if no key exists.
- [ ] Invoke `askOpenAI` and return only `{ content }` on success.
- [ ] Normalize unexpected worker-side failures to safe `WorkerResponse` errors.
- [ ] Keep the Chrome message channel alive correctly for asynchronous responses.

### Files Likely Affected

- `src/background/service-worker.ts`
- `src/shared/types.ts`
- `src/providers/openai.ts`

### Verification

- A valid configured key and prompt return assistant content through `chrome.runtime.sendMessage`.
- Missing key, invalid prompt, invalid key, rate limit, and network failure all reach the caller as normalized responses.
- The background worker has no uncaught promise rejection for handled message paths.

---

## Phase 6 — Implement the Popup Experience `[x]`

**Goal:** Build a focused, accessible ask view and compact settings view that follow `DESIGN.md`.

### Tasks

- [ ] Add `src/popup/styles.css` with centralized semantic color variables and the 4px spacing scale.
- [ ] Build a compact popup layout around 400–420px wide, with scrollable long content and no fixed response height.
- [ ] Build the ask view:
  - compact header with an explicit Settings control
  - labeled multiline textarea with `Ask anything...` placeholder
  - primary Ask button
  - response area that preserves useful line breaks and supports text selection
  - empty response copy: `Your answer will appear here.`
- [ ] Add keyboard behavior:
  - Enter inserts a newline
  - Cmd+Enter / Ctrl+Enter submits
  - whitespace-only input cannot submit
- [ ] Build the settings view:
  - short BYOK explanation
  - appropriately labeled password input with unsuitable spellcheck/autocomplete behavior disabled
  - Save action for an entered key
  - configured status only, never the saved value
  - Replace, Remove, and Back actions
- [ ] Keep a newly typed key only long enough to send it to the worker, then immediately clear the controlled input.
- [ ] Add focus management:
  - focus the question textarea when configured
  - focus the API-key input when configuration is needed
- [ ] Ensure semantic controls, visible `:focus-visible` treatment, accessible button names, and status announcements.

### Files Likely Affected

- `src/popup/App.tsx`
- `src/popup/main.tsx`
- `src/popup/styles.css`
- Optional focused components under `src/popup/components/` only where they improve clarity without over-componentizing

### Verification

- A first-time user lands in API-key setup.
- A configured user lands in the focused ask view.
- Settings temporarily replace or compactly switch from the ask view rather than remaining permanently expanded.
- Long responses remain readable and selectable.
- Keyboard-only interaction supports configuration and asking a question.

---

## Phase 7 — Connect Popup State to Runtime Messaging `[x]`

**Goal:** Make the popup reliably render configuration, loading, success, and error states from safe worker responses.

### Tasks

- [ ] Add a small popup-side messaging helper or focused hooks only if they reduce duplication; do not introduce a generic event bus.
- [ ] Request `GET_SETTINGS_STATUS` when the popup opens.
- [ ] Send `SAVE_API_KEY`, `REMOVE_API_KEY`, and `ASK_AI` via typed runtime messages.
- [ ] Implement the required UI state matrix:
  - no API key
  - ready
  - asking
  - success
  - error
  - settings/configured
- [ ] Disable duplicate Ask submissions during a request and retain the question during loading and errors.
- [ ] Show concise, actionable UI copy for every normalized error category.
- [ ] Provide an appropriate route back to Settings for missing or invalid key errors.
- [ ] Do not fake streaming, add conversation history, or add retry/regenerate controls.

### Files Likely Affected

- `src/popup/App.tsx`
- `src/popup/styles.css`
- Optional `src/popup/hooks/useChat.ts`
- Optional `src/popup/hooks/useSettings.ts`
- `src/shared/types.ts`

### Verification

- Popup state always exits loading after a successful or failed worker response.
- Ask is disabled while loading and enabled only for a non-empty prompt with a configured key.
- Error copy is readable, actionable, and contains no raw OpenAI payload.
- No API key is retained in popup state after save.

---

## Phase 8 — Build, Manual QA, and Security Review `[~]`

**Goal:** Verify the production extension against the MVP architecture, design, and security rules.

### Tasks

- [ ] Run the existing build command: `npm run build`.
- [ ] Load the generated `dist/` directory as an unpacked extension in Chrome.
- [ ] Manually test the full lifecycle:
  - first run and key configuration
  - close and reopen popup
  - replace and remove key
  - successful question
  - invalid key
  - rate-limited/provider failure when safely reproducible
  - unavailable network
- [ ] Confirm the manifest requests exactly `storage` plus the narrow OpenAI host permission.
- [ ] Confirm there are no `tabs`, `activeTab`, `webRequest`, `scripting`, or `<all_urls>` permissions.
- [ ] Inspect popup and worker logs to ensure keys, authorization headers, and raw provider bodies are absent.
- [ ] Confirm the raw saved API key is never returned to the popup.
- [ ] Confirm CSP excludes remote scripts and `unsafe-inline`.
- [ ] Confirm the UI follows `DESIGN.md`: compact layout, accessible focus, semantic state messaging, no decorative over-design.

### Files Likely Affected

- No source change expected unless verification exposes a defect
- `TASKS.md` status markers updated after each accepted phase

### Verification

- The built extension loads and completes the approved MVP flow.
- Every required state is reachable and safe.
- No out-of-scope feature or unnecessary permission has been introduced.

---

## Explicitly Out of Scope for This Plan

- Backend or localhost proxy
- Authentication, accounts, databases, cloud storage, or sync
- Claude, provider/model selection, or a provider registry
- Streaming responses
- Conversation history or multiple simultaneous conversations
- Current-page context, selected-text actions, browser tab access, or content scripts
- Side panel
- RAG, vector database, tools, agents, orchestration frameworks, or dependency injection
- Telemetry, token/cost reporting, retry/regenerate, copy button, Markdown rendering, syntax highlighting, or dark mode
- Client-side API-key encryption

---

## Decisions Confirmed by Existing Documents

| Decision | MVP direction |
|---|---|
| Provider | OpenAI and Gemini |
| Credential model | User-supplied API key (BYOK) |
| Persisted key storage | `chrome.storage.local` |
| Key access and provider calls | Manifest V3 background service worker only |
| Popup/worker transport | Typed `chrome.runtime.sendMessage()` messages |
| API key exposure | Status only to React; never the persisted raw key |
| Rendering | Plain text response with preserved line breaks |
| UI | Light, compact, quiet utility interface |
| Build result | `dist/` loaded as an unpacked Chrome extension |
