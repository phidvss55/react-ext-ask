# Design System

## 1. Purpose

This document defines the visual and interaction rules for the Chrome AI Assistant extension.

It is the source of truth for **how the extension looks and feels**. Technical boundaries belong in `ARCHITECTURE.md`.

The MVP should feel focused, lightweight, calm, and fast. It is a utility, not a full ChatGPT clone or dashboard.

## 2. Core Experience

Primary flow:

```text
Open extension
  → Ask a question
  → See the answer
```

First-time/configuration flow:

```text
Open extension
  → Clear API-key setup
  → Save key
  → Ready to ask
```

## 3. Design Principles

### Simple

Show only what is needed for the current action.

### Compact, not cramped

Use popup space efficiently while retaining comfortable padding and control sizes.

### Content first

The question and AI response are the primary content.

### Clear hierarchy

The user should immediately understand where to ask, whether a request is running, where the answer appears, and how to access settings.

### Quiet interface

Avoid excessive cards, borders, gradients, shadows, badges, icons, and decoration.

### Consistent

Spacing, typography, radii, controls, and states follow shared rules.

## 4. Popup Size and Layout

Recommended MVP target:

```text
Width: 400–420px
Minimum useful height: ~500px
Long content: vertical scrolling
```

Do not force a fixed response height.

Conceptual layout:

```text
┌──────────────────────────────────────────┐
│ AI Assistant                        ⚙    │
│ Ask without leaving your current page    │
├──────────────────────────────────────────┤
│                                          │
│ Ask anything...                          │
│                                          │
│                                  [ Ask ] │
├──────────────────────────────────────────┤
│ Response                                 │
│                                          │
│ Your answer will appear here.            │
│                                          │
└──────────────────────────────────────────┘
```

Settings should be a compact dedicated view or replace the main content temporarily. Do not keep a large settings form permanently expanded.

## 5. Primary Views

### Ask View

Contains:

- compact header
- question textarea
- Ask button
- response area
- lightweight Settings access

### API Key Setup / Settings View

Contains:

- short BYOK explanation
- password-style API-key input
- Save
- configured/not-configured status
- Replace when configured
- Remove when configured
- Back when appropriate

Never show the complete stored API key.

Do not retrieve the persisted secret merely to render masked characters.

## 6. Typography

Use a system-oriented sans-serif stack:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

No downloaded custom font is required for MVP.

Suggested scale:

```text
Popup title     16px / 600
Section title   13–14px / 600
Body/response   14px / 400
Button          14px / 500–600
Helper/status   12px / 400
Code            13px / monospace
```

Response/body line-height: approximately `1.5–1.6`.

Avoid text smaller than 12px.

## 7. Spacing

Use a 4px base grid.

Preferred tokens:

```text
4px
8px
12px
16px
20px
24px
32px
```

Default popup horizontal padding: `16px`.

Prefer tokens over arbitrary spacing values.

## 8. Shape and Borders

Suggested radii:

```text
6px  small/status
8px  input/button
10px panel when a panel is actually useful
```

Prefer subtle borders over heavy shadows.

Use spacing for grouping before introducing another card/container.

## 9. Color Strategy

Start with a clean light theme.

Use centralized semantic CSS variables instead of unrelated component colors:

```css
--color-bg
--color-surface
--color-text
--color-text-secondary
--color-border
--color-primary
--color-primary-hover
--color-focus
--color-error
--color-error-surface
--color-success
--color-disabled
```

Choose accessible final values during implementation.

Do not imitate OpenAI/ChatGPT, Gemini, or Claude branding.

Dark mode is future scope unless separately approved.

## 10. Header

Keep the header compact.

Suggested content:

```text
AI Assistant                    Settings
Optional short helper
```

No hero section or oversized title.

Settings must be discoverable without competing with Ask.

## 11. Question Input

Use a multiline textarea.

Requirements:

- placeholder such as `Ask anything...`
- comfortable minimum height
- visible focus state
- readable text
- no unnecessary decoration
- prevent whitespace-only submission

Keyboard:

```text
Enter        → newline
Cmd + Enter  → submit on macOS
Ctrl + Enter → submit on Windows/Linux
```

Retain the question during loading and on errors.

## 12. Ask Button

The Ask button is the primary action.

States:

- default
- hover
- focus
- disabled
- loading

Disable when:

- input is empty
- request is in progress
- required API configuration is missing

During loading, use `Asking…` or a small spinner with accessible text.

Normally only one visually strong primary action should appear in the Ask view.

## 13. Response Area

The response area should:

- support long text
- wrap naturally
- preserve useful paragraph breaks
- scroll with popup content
- allow text selection/copying
- prioritize readability

Empty state:

```text
Response

Your answer will appear here.
```

MVP may render plain text with preserved line breaks.

Markdown and code highlighting are future enhancements.

Avoid heavy chat bubbles unless conversation mode is introduced later.

## 14. API Key UX

Example first-time copy:

```text
OpenAI API key

Add your own API key to start asking questions.
The key is stored in this Chrome extension profile and used
when sending requests to the provider.

[ •••••••••••••••••••••••••• ]

[ Save key ]
```

Configured state:

```text
✓ API key configured

[ Replace key ]   [ Remove ]
```

For the currently entered key, use an appropriate password input and avoid browser/spellcheck behavior that is inappropriate for secrets.

A show/hide action may reveal only the value currently being typed. It must never retrieve a previously persisted key.

Do not make security claims stronger than those in `ARCHITECTURE.md`.

## 15. Loading

During a request:

- disable duplicate Ask submissions
- retain the question
- show clear progress near the primary action/response
- avoid a full-popup blocking overlay

Do not fake streaming.

## 16. Errors

Errors must be concise and actionable.

Examples:

Missing key:

```text
Add an API key before asking a question.
```

Invalid key:

```text
The AI provider rejected this API key.
```

Rate limit:

```text
The provider rate limit was reached. Try again shortly.
```

Network:

```text
Unable to reach the AI provider. Check your connection and try again.
```

Do not display raw provider payloads.

Use the same semantic error treatment throughout the extension.

## 17. Focus and Keyboard UX

On popup open:

- if configured, prefer focusing the question textarea
- if configuration is required, focus the API-key input

Requirements:

- logical tab order
- visible `:focus-visible`
- Cmd/Ctrl + Enter submission
- do not remove outlines without an accessible replacement

## 18. Accessibility

Minimum expectations:

- semantic controls
- actual labels for inputs
- accessible names for icon-only buttons
- visible keyboard focus
- sufficient contrast
- errors associated with relevant context
- understandable loading status
- status is not communicated by color alone

## 19. Motion

Keep motion minimal.

Allowed:

- subtle hover/focus transitions
- short loading indicator animation
- small view transitions when useful

Avoid decorative entrance animations, bouncing UI, long transitions, and animated gradients.

Respect reduced-motion preferences when animation is introduced.

## 20. Component Guidance

Likely conceptual components:

```text
PopupHeader
QuestionComposer
ResponsePanel
SettingsView
ApiKeyForm
StatusMessage
```

These are not a requirement to create one file for every small element.

Avoid over-componentization.

## 21. UI State Matrix

### No API key

- configuration-required message
- Configure action
- Ask unavailable

### Ready

- question textarea ready/focused
- Ask enabled when text exists
- empty or in-session response visible

### Asking

- question retained
- Ask disabled
- loading feedback

### Success

- response rendered
- Ask available for another request

### Error

- question retained
- readable error
- retry available
- configuration action when relevant

### Settings / Configured

- configured status
- Replace
- Remove
- Back

## 22. Design Anti-Patterns

Do not:

- copy ChatGPT/Gemini/Claude visual design
- build a dashboard
- wrap every section in a card
- use gradients everywhere
- create a large hero
- permanently expose settings controls
- add provider/model selectors before required
- introduce a sidebar for MVP
- use tiny text to save space
- hide important actions behind ambiguous icons
- show the stored API key
- add decorative complexity without product value

## 23. Future Design Extensions

The system should later accommodate:

- provider/model selector
- Markdown
- code blocks
- copy/regenerate
- streaming indicator
- conversation history
- side panel
- current-page context indicator
- selected-text workflows
- dark mode

Future UI should reuse the same spacing, typography, semantic colors, radii, and interaction states.

## 24. Rules for Coding Agents

Read this document before implementing or changing UI.

Prefer existing design tokens/patterns over one-off values.

If a requested UI conflicts with these rules, propose the design-system change rather than silently introducing inconsistent styling.

`DESIGN.md` governs visual and interaction consistency.

`ARCHITECTURE.md` governs technical architecture.
