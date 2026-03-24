# Barra AI — LLM Guidelines

Rules for any AI assistant (Claude, Copilot, etc.) working on this codebase.

---

## Non-negotiable rules

These require explicit written permission from the project owner to override.

- **Never push directly to `main`.** All changes go through a PR from a `claude/` branch.
- **Never modify `manifest.json`** — permissions, host access, and extension metadata are sensitive and reviewed manually.
- **Never change the trigger mechanism.** The `/ai ` + Tab flow is the core product UX. Don't alter the trigger string, the key binding, or the replace-on-trigger behavior.
- **Never delete or disable tests.** Test files are not cleanup targets. Only delete a test if explicitly instructed, and explain why.
- **Never introduce a backend.** This extension is client-side only. No servers, no proxies, no remote logging, no analytics endpoints.

---

## Before every change

1. **Run tests.** All existing tests must pass. Don't land a change that breaks them.

   ```bash
   npm test
   ```

2. **Run lint.** ESLint must be clean (zero warnings, zero errors).

   ```bash
   npm run lint
   ```

3. **No new dependencies without approval.** Do not add to `dependencies` or `devDependencies` in `package.json`. If a dependency is genuinely needed, propose it and wait for explicit approval before installing.
4. **Never commit `package-lock.json` changes.** Do not stage or commit modifications to `package-lock.json` unless you are explicitly adding or upgrading a dependency that has been approved.

---

## Architecture rules

The codebase has clear separation of concerns. Maintain it.

### Layers (don't mix them)

| Layer                   | Location                          | Responsibility                                               |
| ----------------------- | --------------------------------- | ------------------------------------------------------------ |
| DOM abstraction         | `src/content/editableElements.ts` | All element reads/writes go through `EditableElement`        |
| AI routing              | `src/content/ai.ts`               | `fetchAIResponse` entry point, `USE_MOCK`, provider dispatch |
| AI provider — OpenAI    | `src/content/openai.ts`           | OpenAI API calls and response parsing only                   |
| AI provider — Anthropic | `src/content/anthropic.ts`        | Anthropic Messages API calls and response parsing only       |
| AI provider — Gemini    | `src/content/gemini.ts`           | Google Gemini API calls and SSE response parsing only        |
| Storage                 | `src/storages.ts`                 | All Chrome storage access through the `Storage` interface    |
| Background              | `src/background/`                 | Notifications and error surfacing only                       |
| Popup UI                | `src/popup/`                      | Settings and onboarding only                                 |

### Patterns to follow

- **New element types** → implement `EditableElement` interface, don't add ad-hoc DOM manipulation in `content.ts`.
- **New AI providers** → add a new `src/content/<provider>.ts` module modeled on `openai.ts`; register the provider's models in `src/models.ts`; add routing in `src/content/ai.ts`. Use the `Storage` interface for credentials, not hardcoded values. See `gemini.ts` as a recent example.
- **Storage access** → always go through the `Storage` interface, never call `chrome.storage` directly outside of `storages.ts`.
- **Mock support** → `USE_MOCK` is resolved once in `ai.ts`. Provider modules (`openai.ts`, `anthropic.ts`, `gemini.ts`) do not need to handle it — keep mock logic out of provider files.

---

## Code style

- **TypeScript strict mode is on.** No `any`, no suppressed type errors unless unavoidable and commented.
- **No unused variables or parameters.** ESLint enforces this; don't add `eslint-disable` comments to bypass it.
- **Don't refactor code you didn't need to touch.** Scope changes to what was asked. Leave surrounding code as-is.
- **Don't add comments or docstrings to code you didn't change.**

---

## Privacy rules

- API keys are stored in `chrome.storage.local` only. Never log them, transmit them, or expose them in the UI beyond masked input fields.
- Never send prompt text, field content, or page context anywhere other than the configured AI provider API.
- The extension must remain zero-dependency on any third-party service beyond the AI provider.

---

## What's out of scope (don't do unprompted)

- Refactoring working code
- Adding error handling for scenarios that can't happen
- Introducing abstractions for one-off operations
- Adding new UI beyond what was asked
- Upgrading dependencies
- Adding CI configuration changes
