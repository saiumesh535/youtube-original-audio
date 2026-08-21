/**
 * MAIN-world controller. Chromium path matches the last known-good Chrome build
 * (ytInitialPlayerResponse + observe-only fetch + setAudioTrack). Firefox skips
 * fetch wrapping and unwraps the player when needed.
 */
import {
  DEFAULT_CONFIG,
  isConfigMessage,
  type ExtensionConfig,
  type JsonMessageCandidate,
} from "../shared/languages.ts";
import {
  parseYtPlayerUserSettings,
  parseYtPlayerUserSettingsData,
} from "../shared/player-response.ts";
import {
  isOriginalDisplayName,
  isOriginalTrackId,
  trackMatchesPreferredLanguage,
} from "../shared/track-matching.ts";
import type {
  AdaptiveAudioTrackInfo,
  AdaptiveFormat,
  YtPlayerUserSettingsData,
} from "../shared/youtube-types.ts";
import { isJsonObject, parseJsonValue } from "../shared/json.ts";
import { createPageRuntime } from "./runtime.ts";

const AUDIO_SETTING_KEY = "483";
const YT_PLAYER_USER_SETTINGS_KEY = "yt-player-user-settings";
const PLAYER_PATH = "/youtubei/v1/player";
const LOG_PREFIX = "[yt-original-audio]";

const runtime = createPageRuntime();

let config: ExtensionConfig = DEFAULT_CONFIG;
let appliedForVideoKey: string | undefined;
let adWasShowing = false;

function log(message: string): void {
  console.info(`${LOG_PREFIX} ${message}`);
}

function currentVideoKey(): string {
  const url = new URL(window.location.href);
  if (url.pathname.startsWith("/shorts/")) {
    return url.pathname;
  }
  return url.searchParams.get("v") ?? url.pathname;
}

function patchYtPlayerUserSettings(langId: string): void {
  const storage = runtime.getLocalStorage();
  const oneMonthMs = 1000 * 60 * 60 * 24 * 30;
  const now = Date.now();
  const nextData: YtPlayerUserSettingsData = {
    [AUDIO_SETTING_KEY]: { stringValue: langId },
  };

  const existingRaw = storage.getItem(YT_PLAYER_USER_SETTINGS_KEY);
  if (existingRaw !== null) {
    const existingPayload = parseYtPlayerUserSettings(existingRaw);
    if (existingPayload !== undefined) {
      const existingData = parseYtPlayerUserSettingsData(existingPayload.data);
      if (existingData !== undefined) {
        for (const [key, value] of Object.entries(existingData)) {
          if (value !== undefined && nextData[key] === undefined) {
            nextData[key] = value;
          }
        }
      }
    }
  }

  storage.setItem(
    YT_PLAYER_USER_SETTINGS_KEY,
    JSON.stringify({
      creation: now,
      data: JSON.stringify(nextData),
      expiration: now + oneMonthMs,
    }),
  );
  log(`patched localStorage 483 → ${langId}`);
}

function isRecord(value: object): value is Record<string, object | string | number | boolean | null> {
  return !Array.isArray(value);
}

function readLiveAudioTrack(value: object): AdaptiveAudioTrackInfo | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const idValue = value["id"];
  const displayNameValue = value["displayName"];
  if (typeof idValue !== "string" || typeof displayNameValue !== "string") {
    return undefined;
  }
  const audioIsDefaultValue = value["audioIsDefault"];
  const track: AdaptiveAudioTrackInfo = {
    id: idValue,
    displayName: displayNameValue,
    audioIsDefault: audioIsDefaultValue === true,
  };
  const isAutoDubbedValue = value["isAutoDubbed"];
  if (typeof isAutoDubbedValue === "boolean") {
    return { ...track, isAutoDubbed: isAutoDubbedValue };
  }
  return track;
}

function collectLiveAudioFormats(response: object): AdaptiveFormat[] {
  if (!isRecord(response)) {
    return [];
  }
  const streamingData = response["streamingData"];
  if (typeof streamingData !== "object" || streamingData === null || Array.isArray(streamingData)) {
    return [];
  }
  const formatsValue = (streamingData as Record<string, object | string | number | boolean | null>)[
    "adaptiveFormats"
  ];
  if (!Array.isArray(formatsValue)) {
    return [];
  }

  const formats: AdaptiveFormat[] = [];
  for (const item of formatsValue) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, object | string | number | boolean | null>;
    const mimeType = record["mimeType"];
    if (typeof mimeType !== "string") {
      continue;
    }
    const audioTrackValue = record["audioTrack"];
    if (typeof audioTrackValue !== "object" || audioTrackValue === null || Array.isArray(audioTrackValue)) {
      formats.push({ mimeType });
      continue;
    }
    if (readLiveAudioTrack(audioTrackValue) === undefined) {
      formats.push({ mimeType });
      continue;
    }
    formats.push({ mimeType, audioTrack: audioTrackValue as AdaptiveAudioTrackInfo });
  }
  return formats;
}

function findPreferredOriginalFromFormats(
  formats: AdaptiveFormat[],
): AdaptiveAudioTrackInfo | undefined {
  const unique = new Map<string, AdaptiveAudioTrackInfo>();
  for (const format of formats) {
    if (format.audioTrack !== undefined && !unique.has(format.audioTrack.id)) {
      unique.set(format.audioTrack.id, format.audioTrack);
    }
  }

  for (const track of unique.values()) {
    const isOriginal =
      track.isAutoDubbed !== true &&
      (isOriginalDisplayName(track.displayName) || isOriginalTrackId(track.id));
    if (!isOriginal) {
      continue;
    }
    if (trackMatchesPreferredLanguage(track, config.preferredLanguages)) {
      return track;
    }
  }
  return undefined;
}

function selectPreferredOriginalInPlace(response: object): string | undefined {
  if (!config.enabled || config.preferredLanguages.length === 0) {
    return undefined;
  }
  const formats = collectLiveAudioFormats(response);
  if (formats.length === 0) {
    return undefined;
  }
  const selected = findPreferredOriginalFromFormats(formats);
  if (selected === undefined) {
    return undefined;
  }
  for (const format of formats) {
    if (format.audioTrack === undefined) {
      continue;
    }
    format.audioTrack.audioIsDefault = format.audioTrack.id === selected.id;
  }
  patchYtPlayerUserSettings(selected.id);
  log(`selected original "${selected.displayName}" (${selected.id})`);
  return selected.id;
}

function installYtInitialPlayerResponseHook(): void {
  let stored: object | undefined;
  const existing = window.ytInitialPlayerResponse;
  if (existing !== undefined && typeof existing === "object" && existing !== null) {
    stored = existing;
    selectPreferredOriginalInPlace(existing);
  }

  try {
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      enumerable: true,
      get(): object | undefined {
        return stored;
      },
      set(value: object): void {
        stored = value;
        selectPreferredOriginalInPlace(value);
      },
    });
    log("hooked ytInitialPlayerResponse");
  } catch (error) {
    log(`failed to hook ytInitialPlayerResponse: ${String(error)}`);
  }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

/** Observe only — never rewrite the Response body. Chromium only. */
function installFetchHook(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);
    if (!config.enabled || !requestUrl(input).includes(PLAYER_PATH)) {
      return response;
    }
    try {
      const text = await response.clone().text();
      if (!text.includes("audioTrack")) {
        return response;
      }
      const parsed = parseJsonValue(text);
      if (isJsonObject(parsed)) {
        selectPreferredOriginalInPlace(parsed);
      }
    } catch {
      // ignore
    }
    return response;
  };
  log("hooked fetch");
}

function readStringProp(value: object, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const prop = value[key];
  return typeof prop === "string" ? prop : undefined;
}

function extractPlayerTrackName(track: object): string {
  const unwrapped = runtime.unwrap(track);
  if ("getLanguageInfo" in unwrapped && typeof unwrapped.getLanguageInfo === "function") {
    try {
      const info = runtime.unwrap(unwrapped.getLanguageInfo() as object);
      const fromGetter =
        "getName" in info && typeof info.getName === "function"
          ? String(info.getName())
          : readStringProp(info, "name");
      if (fromGetter !== undefined && fromGetter.length > 0) {
        return fromGetter;
      }
    } catch {
      // continue
    }
  }

  for (const value of Object.values(unwrapped)) {
    if (typeof value !== "object" || value === null) {
      continue;
    }
    const inner = runtime.unwrap(value);
    const name = readStringProp(inner, "name") ?? readStringProp(inner, "displayName");
    if (name !== undefined && name.length > 0) {
      return name;
    }
  }

  try {
    return String(unwrapped);
  } catch {
    return "";
  }
}

function extractPlayerTrackId(track: object): string {
  const unwrapped = runtime.unwrap(track);
  if ("getLanguageInfo" in unwrapped && typeof unwrapped.getLanguageInfo === "function") {
    try {
      const info = runtime.unwrap(unwrapped.getLanguageInfo() as object);
      const fromGetter =
        "getId" in info && typeof info.getId === "function"
          ? String(info.getId())
          : readStringProp(info, "id");
      if (fromGetter !== undefined && fromGetter.length > 0) {
        return fromGetter;
      }
    } catch {
      // continue
    }
  }
  const direct = readStringProp(unwrapped, "id");
  if (direct !== undefined) {
    return direct;
  }
  for (const value of Object.values(unwrapped)) {
    if (typeof value !== "object" || value === null) {
      continue;
    }
    const id = readStringProp(runtime.unwrap(value), "id");
    if (id !== undefined && id.includes(".")) {
      return id;
    }
  }
  return "";
}

function syncAdState(): void {
  const adNow = runtime.isAdShowing();
  if (adWasShowing && !adNow) {
    log("ad ended — reapplying original audio");
    appliedForVideoKey = undefined;
    scheduleFallbackPasses();
  }
  adWasShowing = adNow;
}

/**
 * Same strategy as the last known-good Chrome build:
 * wait until the player exposes tracks, call setAudioTrack once, stop.
 */
function applyPlayerApiFallbackOnce(): void {
  if (!config.enabled || config.preferredLanguages.length === 0) {
    return;
  }

  runtime.observePlayerClass(syncAdState);
  syncAdState();
  if (runtime.isAdShowing()) {
    return;
  }

  const videoKey = currentVideoKey();
  if (appliedForVideoKey === videoKey) {
    return;
  }

  const player = runtime.getMoviePlayer();
  if (player === undefined) {
    return;
  }

  let tracks: object[] = [];
  try {
    tracks = player.getAvailableAudioTracks();
  } catch {
    return;
  }
  if (tracks.length === 0) {
    return;
  }

  let currentName = "";
  try {
    const current = player.getAudioTrack?.();
    if (current !== undefined) {
      currentName = extractPlayerTrackName(current);
    }
  } catch {
    // ignore
  }

  if (
    isOriginalDisplayName(currentName) &&
    trackMatchesPreferredLanguage(
      { id: "current", displayName: currentName, audioIsDefault: true },
      config.preferredLanguages,
    )
  ) {
    appliedForVideoKey = videoKey;
    log(`already on preferred original (${currentName})`);
    return;
  }

  for (const track of tracks) {
    const unwrappedTrack = runtime.unwrap(track);
    const name = extractPlayerTrackName(unwrappedTrack);
    const id = extractPlayerTrackId(unwrappedTrack);
    if (!isOriginalDisplayName(name)) {
      continue;
    }
    const synthetic: AdaptiveAudioTrackInfo = {
      id: id.length > 0 ? id : `name:${name}`,
      displayName: name,
      audioIsDefault: false,
    };
    if (!trackMatchesPreferredLanguage(synthetic, config.preferredLanguages)) {
      continue;
    }
    try {
      appliedForVideoKey = videoKey;
      player.setAudioTrack(unwrappedTrack);
      if (id.length > 0) {
        patchYtPlayerUserSettings(id);
      }
      log(`setAudioTrack → ${name}`);
      return;
    } catch (error) {
      appliedForVideoKey = undefined;
      log(`setAudioTrack failed: ${String(error)}`);
    }
  }
}

function scheduleFallbackPasses(): void {
  const delays = [300, 800, 1500, 2500];
  for (const delay of delays) {
    window.setTimeout(() => {
      applyPlayerApiFallbackOnce();
    }, delay);
  }
}

function installNavigationListeners(): void {
  document.addEventListener("yt-navigate-finish", () => {
    appliedForVideoKey = undefined;
    adWasShowing = runtime.isAdShowing();
    scheduleFallbackPasses();
  });
}

function installConfigListener(): void {
  // event.source === window is the known-good Chromium bridge↔page filter.
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) {
      return;
    }
    const candidate = event.data as JsonMessageCandidate;
    if (!isConfigMessage(candidate)) {
      return;
    }
    config = candidate.config;
    log(
      `config enabled=${String(config.enabled)} langs=${config.preferredLanguages.join(",")}`,
    );
    appliedForVideoKey = undefined;
    scheduleFallbackPasses();
  });

  window.postMessage(
    {
      source: "yt-original-audio",
      type: "yt-original-audio-request-config",
    },
    "*",
  );
}

installConfigListener();
installYtInitialPlayerResponseHook();
if (runtime.shouldHookFetch) {
  installFetchHook();
}
installNavigationListeners();
scheduleFallbackPasses();
log(`page script ready (${runtime.id})`);
