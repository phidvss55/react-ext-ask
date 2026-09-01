Read `AGENTS.md` and any relevant repository instructions if they exist.

I want to establish the architecture for a Chrome AI Assistant extension before implementing anything.

IMPORTANT:

This task is documentation/design only.

Do NOT implement the extension.
Do NOT create React/Vite code.
Do NOT install dependencies.
Do NOT create the service worker yet.
Do NOT initialize a project.
Do NOT modify any existing application code.

Create a `DESIGN.md` describing the agreed architecture.

## Product

We are building a Chrome Extension where the user can open the extension popup, type a question, send it directly to an AI provider, and see the response without opening ChatGPT/Gemini/etc.

Users provide their own API key (BYOK).

## Technology

Use:

- Chrome Extension Manifest V3
- React
- TypeScript
- Vite

Do NOT use:

- Next.js
- Express
- NestJS
- standalone backend services
- localhost proxy servers

There is no separately deployed backend.

## Architecture

The intended flow is:

React Popup
→ `chrome.runtime.sendMessage()`
→ Manifest V3 Background Service Worker
→ AI Provider HTTPS API
→ Background Service Worker
→ React Popup

The background service worker is part of the Chrome Extension.

It is NOT a backend server and must not require a separately running process.

## Responsibilities

### React Popup

Responsible for presentation and user interaction:

- question input
- Ask button
- loading state
- response rendering
- error rendering
- API key configuration UI

React should NOT perform AI-provider HTTP requests directly.

React should NOT retrieve the persisted API key after it has been saved.

### Background Service Worker

Responsible for:

- receiving Chrome runtime messages
- reading the API key
- calling the AI provider
- normalizing provider errors
- returning safe responses to React

### Storage

For MVP use:

`chrome.storage.local`

Store the user's API key there.

The service worker should be the primary component responsible for reading the persisted key.

The API key must never:

- be logged
- be included in URLs
- be committed to source control
- be bundled through Vite environment variables
- be returned to React after storage
- appear in normal error messages

Document clearly that this protects against accidental exposure and unnecessary access but cannot make a user-provided secret completely inaccessible to someone who controls the browser/profile or can inspect the extension runtime.

Do not invent client-side encryption that stores both the encryption mechanism/key and encrypted API key in the extension.

## MVP provider

Initially implement only OpenAI.

However, keep the provider boundary simple enough that Gemini, Claude, or other providers could be added later.

Do NOT introduce an elaborate agent framework.

For MVP this is simply:

Question → AI Provider → Answer

## MVP UI

The popup initially needs:

- API key configuration
- question textarea
- Ask button
- loading state
- AI response area
- error state

API key configuration should support:

- Save
- Replace
- Remove
- Detect whether a key is configured

Never display the complete stored API key.

## Architecture principles

Prefer simplicity.

Avoid unnecessary abstractions.

A likely structure is approximately:

```text
src/
  popup/
    App.tsx
    main.tsx

  background/
    service-worker.ts

  providers/
    openai.ts

  shared/
    types.ts

manifest.json
vite.config.ts
```

This is only a suggestion. Improve it if there is a clear reason, but explain why.

## Future considerations

The design may leave room for:

- Gemini / Claude
- model selection
- streaming
- Markdown/code rendering
- conversation history
- current-page context
- selected-text actions
- side panel
- keyboard shortcuts
- agent/tool capabilities

Do NOT design or implement these in detail yet.

## Required DESIGN.md content

Include:

1. Product goal
2. MVP scope
3. Non-goals
4. Architecture diagram
5. Component responsibilities
6. Request flow
7. API key lifecycle
8. Security model and threat limitations
9. Manifest V3 considerations
10. Provider abstraction
11. Proposed project structure
12. Error handling strategy
13. Future extension points
14. Important architectural constraints

After creating `DESIGN.md`, STOP.

Report what you wrote and any architectural concerns you discovered.

Do not proceed with implementation until I review and explicitly approve the design.
