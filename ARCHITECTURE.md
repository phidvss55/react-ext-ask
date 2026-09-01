# Architecture

## 1. Purpose

This document is the technical source of truth for the Chrome AI Assistant extension.

The extension lets users open a Chrome popup, enter a question, send it to an AI provider with their own API key (BYOK), and see the answer without opening an AI website.

UI/visual rules belong in `DESIGN.md`.

## 2. Core Decisions

- Chrome Extension Manifest V3
- React + TypeScript + Vite
- Build output: `dist/`, loadable through Chrome → Extensions → Developer Mode → Load unpacked
- No Next.js
- No Express/NestJS
- No standalone/deployed backend
- No localhost proxy
- React handles presentation and interaction
- Manifest V3 background service worker handles persisted credentials and provider requests
- `chrome.storage.local` stores the user's API key for MVP
- OpenAI and Gemini are supported BYOK providers
- Keep the provider boundary simple enough for additional providers later
- Least-privilege Chrome permissions
- No agent/orchestration framework for the MVP

## 3. High-Level Architecture

```text
┌───────────────────────────────────────────────────────────┐
│                    Chrome Extension                       │
│                                                           │
│  React Popup                                              │
│  - question input                                         │
│  - response                                               │
│  - loading/errors                                         │
│  - API-key settings                                       │
│          │                                                │
│          │ chrome.runtime.sendMessage()                   │
│          ▼                                                │
│  Background Service Worker                                │
│  - message handling                                       │
│  - credential access                                      │
│  - provider invocation                                    │
│  - error normalization                                    │
│          │                         │                       │
│          │                         ▼                       │
│          │                  chrome.storage.local           │
│          │                  - API key                      │
└──────────┼────────────────────────────────────────────────┘
           │ HTTPS
           ▼
       OpenAI API
```

The background service worker is part of the extension. It is not an HTTP server and requires no separately running process.

## 4. Responsibilities

### React Popup

Responsible for:

- rendering the popup
- accepting questions
- basic input validation
- sending typed Chrome runtime messages
- loading/success/error states
- API-key configuration UI
- displaying whether a key is configured

React must not:

- call OpenAI directly
- retrieve the persisted API key during normal operation
- build provider authorization headers
- log secrets
- depend on provider-specific HTTP response structures

A newly typed API key necessarily exists temporarily in the settings input. After saving, clear that input and do not read the stored value back into React.

### Background Service Worker

Responsible for:

- receiving popup messages
- validating message types/payloads
- saving/replacing/removing the API key
- reporting configuration status without returning the secret
- reading the key when making a provider request
- calling the provider module
- normalizing errors
- returning safe serializable results

### Provider Modules

OpenAI and Gemini for MVP.

Responsible for:

- endpoint details
- authorization header
- provider request payload
- provider response parsing
- mapping provider failures to internal errors

Do not create a large provider framework.

### Storage

Use `chrome.storage.local`.

Do not use `localStorage` for the persisted credential.

The storage shape should be typed and centralized.

## 5. Ask Request Flow

Example: `Explain Kubernetes ReplicaSet`

```text
1. User types the question.
2. Popup rejects empty/whitespace-only input.
3. Popup enters loading state.
4. Popup sends ASK_AI through chrome.runtime.sendMessage().
5. Service worker receives the message.
6. Worker reads the API key from chrome.storage.local.
7. Missing key → normalized MISSING_API_KEY response.
8. Worker calls the OpenAI provider module.
9. Provider creates the HTTPS request and Authorization header.
10. OpenAI responds.
11. Provider extracts assistant content.
12. Worker returns an internal response to React.
13. React leaves loading state and renders the answer.
```

No localhost request exists between React and the service worker.

## 6. API Key Lifecycle

### Save

```text
Settings input
  → SAVE_API_KEY message
  → service worker
  → chrome.storage.local
```

After success:

- clear the input
- keep only `apiKeyConfigured: true` in UI state
- never return the stored key to React

### Read

Only the service worker reads the persisted key when provider communication requires it.

For settings, expose status only, e.g.:

```ts
{ apiKeyConfigured: true, provider: "openai" }
```

### Replace

A new key sent to the worker replaces the previous key.

### Remove

React requests removal; the worker deletes it and returns updated configuration status.

## 7. Security Model

The goal is to reduce accidental and unnecessary exposure of a BYOK credential.

Protect against:

- committing a provider key into source control
- bundling a key in Vite environment variables
- logging the key
- putting the key in URLs/query strings
- unnecessarily passing the persisted key through React
- ordinary websites directly accessing extension storage
- unrelated UI components accessing the stored credential

This architecture does **not** make the key impossible to extract by someone who controls the Chrome profile, local machine, DevTools, or extension runtime.

The service-worker boundary reduces exposure; it is not a server-side secret vault.

Do not add cosmetic client-side encryption where the encrypted value and the decryption key/mechanism both ship in the extension.

Never:

- log API keys or authorization headers
- include secrets in errors
- use `VITE_*` for user/provider secrets
- hardcode secrets
- return the persisted secret to React
- send the key in a URL

Use HTTPS provider endpoints only.

## 8. Manifest V3

Expected concepts:

- `action.default_popup` → popup HTML
- `background.service_worker` → compiled worker
- `permissions` → only required Chrome APIs
- `host_permissions` → only required provider API origins

Likely MVP permission:

- `storage`

Restrict host permissions to the OpenAI and Gemini API origins actually required.

Do not request these for MVP unless a later feature proves a need:

- `<all_urls>`
- `tabs`
- `activeTab`
- `webRequest`
- `scripting`

Current-page context is out of scope, so tab/page permissions are unnecessary.

## 9. Internal Messaging

Use a small discriminated TypeScript message contract.

Conceptual message types:

- `ASK_AI`
- `SAVE_API_KEY`
- `REMOVE_API_KEY`
- `GET_SETTINGS_STATUS`

Do not introduce an event bus.

Provider-specific request/response objects must not leak into the popup messaging contract.

## 10. Provider Boundary

MVP: OpenAI only.

A minimal internal boundary is sufficient:

```ts
type AskInput = {
  prompt: string;
};

type AskResult = {
  content: string;
};
```

The exact implementation may be a function or small interface.

Do not introduce `AgentManager`, `AgentRegistry`, `AgentExecutor`, orchestration frameworks, or a dependency-injection container.

## 11. Error Handling

Normalize provider/network failures before React receives them.

Suggested categories:

- `MISSING_API_KEY`
- `INVALID_API_KEY`
- `RATE_LIMITED`
- `NETWORK_ERROR`
- `PROVIDER_ERROR`
- `INVALID_REQUEST`
- `UNKNOWN_ERROR`

React renders user-friendly messages, not raw provider payloads.

Errors must never contain the API key or Authorization header.

## 12. Proposed Project Structure

```text
.
├── AGENTS.md
├── ARCHITECTURE.md
├── DESIGN.md
├── README.md
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── popup/
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── styles.css
    ├── background/
    │   └── service-worker.ts
    ├── providers/
    │   └── openai.ts
    └── shared/
        └── types.ts
```

Do not create empty layers for hypothetical future complexity.

## 13. MVP Scope

Included:

- popup
- React + TypeScript + Vite
- Manifest V3
- OpenAI BYOK
- save/replace/remove key
- key-configured status
- ask a text question
- loading state
- text response
- normalized errors
- service worker
- OpenAI provider module
- `dist/` build

Not included:

- backend
- Next.js
- authentication/accounts
- database/cloud sync
- RAG
- tools/agents
- browser-page context
- tab access
- selected-text actions
- side panel
- multiple providers
- telemetry
- complex model configuration
- streaming unless separately approved

## 14. Future Extension Points

Later, without changing the MVP now:

- Gemini / Claude
- provider/model selector
- streaming
- Markdown/code rendering
- conversation history
- copy/regenerate
- system prompts
- side panel
- keyboard shortcuts
- current-page context
- selected-text actions
- true tool/agent capabilities

## 15. Rules for Coding Agents

Before implementation, read:

1. `AGENTS.md` when present
2. `ARCHITECTURE.md`
3. `DESIGN.md`

Do not silently change architecture.

Specifically, do not:

- introduce Next.js or a standalone backend
- call OpenAI directly from React
- expose the persisted key to React
- request broad Chrome permissions without justification
- add fake client-side secret encryption
- add an agent framework to the simple Q&A MVP
- add out-of-scope features without approval

If implementation requires an architectural change, stop and propose it for review first.
