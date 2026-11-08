# TEMPVS — Obsidian plugin preview (phase 2)

This is a **preview build**, not yet a production release. It uses the same shared scheduling, Pomodoro phase, normalization and measured focus modules as the PWA.

## Installation in a test vault

1. In GitHub Actions, open **Build Obsidian plugin** for pull request #11 and download `tempvs-obsidian-preview`.
2. Extract the three files `main.js`, `manifest.json`, and `styles.css`.
3. Place them together in `<test vault>/.obsidian/plugins/tempo-pomodoro/`.
4. Enable **Tempo — Pomodoro** in Obsidian → Community plugins.
5. Use the timer ribbon icon or the command **Apri timer TEMPVS**; on desktop, click its status bar text.

A BRAT-compatible release will follow only after branch integration and device testing.

## Functions available

- Session start with gross duration, focus cycle and optional custom break budget.
- Phase-accurate countdown and pause/finish commands.
- Quick planning with **explicit start times**, e.g. `Studio @1,5h +16:00`.
- Scheduled-session list, deletion of future sessions and measured focus statistics.
- Native status bar item on desktop; ribbon/command + plugin panel on mobile, **no always-on overlays**.
- Locally saved plugin data, retained between Obsidian restarts.

## Limitations

- Dropbox sync is **not yet wired into the Obsidian plugin**. Phase 3 will add OAuth, sync and conflict handling. The existing PWA Dropbox integration is not altered.
- The plugin does not yet import the PWA's cloud data automatically; its local archive is independent.
- Automated scheduling without explicit start times and advanced PWA table planning are not included in this preview.
- Ambient audio, focus chime, fullscreen and PiP are not in this initial plugin.
- Foreground time measurement is limited by Obsidian and the operating system's background execution policy.
- Test on a separate vault. Do not replace a plugin installation containing data without exporting or backing up its existing `data.json`.
