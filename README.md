# React AI Chrome Extension

A Chrome Extension (Manifest V3) that lets you query an AI assistant directly from the browser toolbar. No need to open ChatGPT, Gemini, or any AI website. Bring your own API key.

---

## Features (Phase 1)

- Ask any question from the Chrome popup
- Powered by OpenAI (GPT-4o-mini) or Google Gemini (`gemini-3-flash`)
- Secure API key storage — key never leaves the extension or appears in logs
- Clean loading, success, and error states
- Keyboard shortcut: Ctrl/Cmd + Enter to submit
- Settings panel to save, replace, or remove your API key

---

## Requirements

- Node.js 18+
- Chrome 116+ (Manifest V3)
- An [OpenAI API key](https://platform.openai.com/api-keys) or [Google AI API key](https://aistudio.google.com/app/apikey)

---

## Getting Started

### Install dependencies

```bash
npm install
```

### Development build (watch mode)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

The extension is output to `dist/`.

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `dist/` directory

---

## Configuration

On first launch the extension will show a Settings panel.

1. Choose OpenAI or Google Gemini, then paste that provider's API key into the password field
2. Click **Save**
3. The key is stored in `chrome.storage.local` — scoped to this extension only

To replace or remove the key, click the **Settings** button in the popup.

---

## Project Structure

```
react-ext-ai/
├── manifest.json               # Chrome Extension manifest (MV3)
├── vite.config.ts
├── tsconfig.json
├── index.html                  # Popup entry
│
└── src/
    ├── popup/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── ChatPanel.tsx
    │   │   ├── SettingsPanel.tsx
    │   │   ├── ResponseArea.tsx
    │   │   ├── StatusBanner.tsx
    │   │   └── KeyStatus.tsx
    │   └── hooks/
    │       ├── useChat.ts
    │       └── useSettings.ts
    │
    ├── background/
    │   └── service-worker.ts   # Handles AI requests & key storage
    │
    ├── providers/
    │   ├── ai-provider.ts      # AIProvider interface
    │   └── openai-provider.ts
    │
    ├── services/
    │   ├── ai.service.ts
    │   └── storage.service.ts
    │
    ├── messaging/
    │   └── messages.ts         # Typed popup ↔ service worker contracts
    │
    └── types/
        └── index.ts
```

---

## Architecture

All sensitive operations (API key reads, outbound AI requests) happen exclusively in the **background service worker** — never in the popup/renderer process.

```
Popup (React)
    ↕ chrome.runtime.sendMessage (typed messages)
Background Service Worker
    ↕ chrome.storage.local (key storage)
    ↕ fetch() (AI provider API)
OpenAI (or other provider)
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the technical architecture, security model, and data flow. See [`DESIGN.md`](./DESIGN.md) for the UI system.

---

## Security

- Your API key is stored in `chrome.storage.local` — inaccessible to websites and other extensions
- The key is **never** sent to the popup, logged, or included in error messages
- All AI requests are made from the service worker, not the page renderer
- No `.env` files, no `VITE_*` variables, no key in the bundle

See [`ARCHITECTURE.md §7`](./ARCHITECTURE.md) for the full threat model.

---

## Adding a New AI Provider

1. Create `src/providers/<name>.ts` with the same narrow provider-neutral input/result boundary
2. Map HTTP errors to `AppErrorCode`
3. Add the provider hostname to `host_permissions` in `manifest.json`

---

## Scripts

| Command           | Description                        |
|-------------------|------------------------------------|
| `npm run dev`     | Vite watch mode                    |
| `npm run build`   | Production build to `dist/`        |
| `npm run preview` | Preview built output               |

---

## AI Materials

| File            | Purpose                                               |
|-----------------|-------------------------------------------------------|
| `DESIGN.md`     | Architecture, component design, security model        |
| `AGENTS.md`     | Rules and conventions for AI agents                   |
| `TASKS.md`      | Phased implementation plan with acceptance criteria   |
| `REQUIREMENT.md`| Original product requirements (do not modify)         |

---

## License

MIT
