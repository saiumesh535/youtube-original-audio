# Store listing copy

Paste into the Chrome Web Store and Firefox Add-ons dashboards. Package: `release/youtube-original-audio-1.4.0.zip` after `pnpm bundle`.

## Shared

- **Name:** YouTube Original Audio
- **Summary / short description:** Switch YouTube to the original audio track when that language is one you selected.
- **Category:** Productivity
- **Homepage:** https://saiumesh535.github.io/youtube-original-audio/
- **Privacy policy:** https://saiumesh535.github.io/youtube-original-audio/privacy.html
- **Support / source:** https://github.com/saiumesh535/youtube-original-audio
- **License (Firefox):** MIT

## Description

YouTube auto-dubs videos into your interface language. The original track is still there — labeled Hindi original, Telugu original, and so on — but it is not the default. You have to hunt for it on every video.

This extension flips it back. Pick the languages you understand. When a video’s original track matches, it switches. When it doesn’t, YouTube is left alone.

Open the popup, turn it on, and select your languages. Hindi is selected by default.

Not affiliated with YouTube or Google.

## Assets

| Asset | File | Size |
| --- | --- | --- |
| Store / extension icon | `src/icons/icon128.png` | 128×128 |
| Screenshot | `docs/store/screenshot-popup.png` | 1280×800 |
| Small promo tile (Chrome) | `docs/store/promo-440x280.png` | 440×280 |
| Marquee promo tile (Chrome) | `docs/store/promo-1400x560.png` | 1400×560 |

All promo/screenshot PNGs are 24-bit RGB (no alpha), as required by the Chrome Web Store.

## Chrome Web Store — permission justification

- **storage:** Saves the on/off switch and preferred languages on your device (and in browser sync when available).
- **Host access** (`youtube.com`, `m.youtube.com`, `youtube-nocookie.com`): Required so the extension can read available audio tracks on YouTube pages and select the original track when it matches a language you chose.

## Chrome Web Store — privacy certifications

- Do not sell or transfer user data to third parties (outside approved use cases).
- Do not use or transfer user data for purposes unrelated to the item’s single purpose.
- Do not use or transfer user data to determine creditworthiness or for lending.

**Data collected by the developer:** None. Preferences stay in browser extension storage. No remote analytics or developer-operated servers.

**Privacy policy URL:** https://saiumesh535.github.io/youtube-original-audio/privacy.html

## Firefox Add-ons notes

- Same name, summary, and description as above.
- Manifest already declares `browser_specific_settings.gecko.data_collection_permissions.required: ["none"]`.
- Extension id: `youtube-original-audio@saiumesh535.github.io`
- If review asks for original source, point to the Git tag for this version (`v1.4.0`). TypeScript is bundled with esbuild; it is not minified.

## Review note (main-world content script)

The MAIN-world content script (`content/page.js`) must run in the page context to read `ytInitialPlayerResponse` and call the player’s `setAudioTrack` before the dub settles. The isolated `content/bridge.js` only reads extension storage and posts config into the page.
