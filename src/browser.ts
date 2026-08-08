/**
 * Single entry point for the WebExtension API.
 *
 * Everything under `src/` imports `browser` from here — never from a bare global
 * and never from `wxt/browser` directly. WXT auto-imports are disabled
 * (`imports: false` in `wxt.config.ts`) so every call site is an explicit,
 * greppable import that TypeScript, ESLint and Jest all resolve the same way.
 *
 * `@wxt-dev/browser` resolves to `globalThis.browser ?? globalThis.chrome`, so
 * this works on Chromium today and on Firefox without further changes.
 */
export { browser } from 'wxt/browser';
export type { Browser } from 'wxt/browser';
