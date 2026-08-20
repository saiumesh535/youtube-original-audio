# YouTube Original Audio

Chromium and Firefox extension that switches YouTube to the **original** audio track when that original language is one you configured (for example `Hindi original` instead of Auto-dubbed English).

Built with **TypeScript 7** and **pnpm**. Load the built `dist/` folder as an unpacked extension.

## Behavior

- Enabled by default, with **Hindi** selected.
- If a video’s original track matches a preferred language → select it before playback when possible.
- If the original language is not in your list → leave YouTube’s default (often auto-dubbed) alone.
- Matching uses the `"… original"` label and YouTube’s internal original track id (`.4` suffix).

## Develop

```bash
pnpm install
pnpm typecheck
pnpm build
```

Output is written to `dist/`. After rebuilding, open `chrome://extensions` and click **Reload** on the extension, then hard-refresh the YouTube tab.

In the page console, look for `[yt-original-audio]` debug logs (for example `page script ready`, `selected original "Hindi original"`).

## Install (Chromium: Chrome / Edge / Brave)

1. Run `pnpm build`.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. **Load unpacked** → choose the `dist` directory.

## Install (Firefox)

1. Run `pnpm build`.
2. Open `about:debugging#/runtime/this-firefox`.
3. **Load Temporary Add-on…** → select `dist/manifest.json`.

Firefox temporary add-ons are cleared when the browser restarts.

## Configure

Open the extension popup:

- Toggle the extension on/off.
- Check the original languages you understand (Hindi, Telugu, Tamil, …).

Changes save to `chrome.storage.sync` and apply on the next player load / navigation.

## How it works

1. A MAIN-world content script hooks `ytInitialPlayerResponse` and `fetch` for `/youtubei/v1/player`.
2. It marks the matching original track with `audioIsDefault` and patches `yt-player-user-settings` key `483`.
3. An isolated-world bridge reads storage and `postMessage`s config into the page.
4. A fallback uses `#movie_player.getAvailableAudioTracks()` / `setAudioTrack()` if intercepts miss.

## Manual checks

- Hindi original + English auto-dub, Hindi checked → starts in Hindi.
- Same video, Hindi unchecked → stays auto-dubbed English.
- Unrelated original language → unchanged unless that language is checked.
- SPA navigation to another video still applies.
- Popup toggle off → YouTube default on the next video.
