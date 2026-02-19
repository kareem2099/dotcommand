/**
 * Logger Utility — DotCommand
 *
 * Silences console.log / console.warn in production builds.
 * console.error is always kept (real errors should always be visible).
 *
 * How it works:
 *  - In Development  (F5 / Run Extension): all logs print normally
 *  - In Production   (installed from marketplace): log + warn are silenced
 *  - In Test mode    (extension tests): all logs print normally
 *
 * Usage:
 *  1. Call initializeLogger(context) once at the top of activate()
 *  2. Everything else is automatic — no need to change any console.log calls
 *
 * For webviews:
 *  Use getWebviewDevScript() to inject a <script> block into webview HTML
 *  that suppresses console.log/warn in the webview context too.
 */

import { ExtensionContext, ExtensionMode } from 'vscode';

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

let _isDev = false;

// ─────────────────────────────────────────────────────────────────────────────
// Initializer — call once in activate()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize the logger.
 * Must be called as the FIRST thing in activate() before any other code runs.
 */
export function initializeLogger(context: ExtensionContext): void {
  _isDev = context.extensionMode !== ExtensionMode.Production;

  if (!_isDev) {
    // ── Production: silence log + warn ────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const noop = (): void => {};
    console.log  = noop;
    console.warn = noop;
    // console.error is intentionally kept — real errors must surface
    // console.info is also silenced
    console.info  = noop;
    console.debug = noop;
  }
  // Development / Test: leave console untouched — full output
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper exports
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true when running in Development or Test mode */
export function isDevMode(): boolean {
  return _isDev;
}

/**
 * Returns a tiny <script> block to inject into webview HTML.
 * In production, it overrides console.log/warn/info/debug with no-ops
 * so the webview JS is also silent.
 *
 * Usage in webview HTML builder:
 *   const html = `<!DOCTYPE html>
 *     <head>
 *       ${getWebviewDevScript()}
 *       ...
 *     </head>`;
 */
export function getWebviewDevScript(nonce?: string): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : '';

  if (_isDev) {
    // Development: inject a visible marker so devtools shows the mode
    return `<script${nonceAttr}>window.__DEV__ = true; console.log('[DotCommand] 🛠️ Dev mode — logging enabled');</script>`;
  }

  // Production: silence all webview console output
  return `<script${nonceAttr}>
    window.__DEV__ = false;
    (function() {
      const noop = function() {};
      console.log   = noop;
      console.warn  = noop;
      console.info  = noop;
      console.debug = noop;
      // console.error is kept for real webview errors
    })();
  </script>`;
}
