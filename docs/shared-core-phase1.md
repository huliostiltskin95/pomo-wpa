# TEMPVS — Shared core, phase 1

## Current boundaries
- `core/tempo-core.js`: pure session scheduling, time and Pomodoro calculations.
- `core/tempo-simple.js`: archive normalization, rapid planning, measured focus.
- `core/tempo-merge.js`: deterministic three-way Dropbox merge.
- `core/tempo-archive-store.js`: key/value persistence adapter (browser today, native plugin later).
- `core/tempo-dropbox.js`: Dropbox protocol; persistent storage, transient OAuth storage and navigation can be injected through `platform`.
- `simple.js`: PWA-specific DOM, service worker, audio and screen APIs.

## Invariants
- The existing browser storage keys and Dropbox backup path remain unchanged.
- Scheduled durations are gross time (breaks included).
- Historical focused time counts only observed focus intervals.
- Session completion does not automatically complete tasks.
- All remote snapshot replacements retain local recovery behavior.

## Obsidian adapter contract (phase 2)
- `storage` and `transientStorage`: synchronous getItem / setItem / removeItem key/value APIs. An Obsidian implementation must keep the in-memory snapshot updated synchronously and persist its values safely through Obsidian plugin storage, including across app restarts; do not implement them with fire-and-forget writes.
- `redirectUri()`, `currentUrl()`, `navigate(url)`, `clearCallback()`: platform-specific OAuth redirection/callback handling. Android/iOS handling needs end-to-end testing; no promise of silent automatic OAuth.
- `createArchiveStore` accepts any synchronous key/value adapter and an existing archive normalizer.
- The plugin must not import `simple.js`; it imports only the core modules and uses its own view.

## Mobile UI decision
Avoid persistent page-level DOM overlays and polling. On desktop use `addStatusBarItem()`. On mobile, where the native Obsidian status bar API is not supported, show a lightweight timer in the plugin's own view (or command/ribbon entry where supported) with no always-on floating overlay. This favors battery use, performance and compatibility on iPad, Android and e-ink devices.

## Phase 1 verification
Run `npm test` (Node test runner) and smoke test browser local backup, Dropbox connect/sync/merge, and offline reload. This branch changes no backup schema and requires no migration.
