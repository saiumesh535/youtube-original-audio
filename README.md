# YouTube Original Audio

A Chromium and Firefox extension that switches YouTube back to the **original** audio track when that language is one you understand.

YouTube often starts auto-dubbed English. If the original is Hindi (shown as `Hindi original` in settings), this extension selects it before — or just after — playback starts.

## What it does

- Enabled by default, with **Hindi** selected.
- Switches only when the original language is in your list.
- Leaves auto-dubbed audio alone if the original is some other language.
- Detects originals via the `"… original"` label and YouTube’s `.4` track id.

## Install

Requires [pnpm](https://pnpm.io/) and Node.js.

```bash
pnpm install
pnpm build
```

Load the **`dist/`** folder as an unpacked extension.

### Chrome / Edge / Brave

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. **Load unpacked** → select `dist`.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. **Load Temporary Add-on…** → select `dist/manifest.json`.

Temporary add-ons are cleared when Firefox restarts.

After `pnpm build`, click **Reload** on the extension, then hard-refresh the YouTube tab.

## Configure

Open the toolbar popup:

- Toggle **Power** on or off.
- Search and select the original languages you understand.

Settings sync via `chrome.storage.sync` and apply on the next video load.

## Develop

```bash
pnpm install
pnpm typecheck
pnpm build
```

TypeScript 7, bundled with esbuild. Source lives in `src/`; output is `dist/`.

In the YouTube page console, look for `[yt-original-audio]` (for example `page script ready` or `setAudioTrack → Hindi original`).

## How it works

1. A MAIN-world script at `document_start` hooks `ytInitialPlayerResponse` and `fetch` for `/youtubei/v1/player`.
2. It prefers the matching original track and writes YouTube’s `yt-player-user-settings` audio key (`483`).
3. An isolated-world bridge reads storage and posts config into the page.
4. A one-shot fallback calls `#movie_player.setAudioTrack()` once tracks exist.

## Manual checks

- Hindi original + English auto-dub, Hindi selected → Hindi.
- Same video, Hindi unselected → stays auto-dubbed English.
- Another original language → unchanged unless that language is selected.
- Clicking a related video still applies.
- Power off → YouTube’s default on the next video.
