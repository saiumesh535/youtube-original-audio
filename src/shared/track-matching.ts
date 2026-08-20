import { LANGUAGES, ORIGINAL_KEYWORDS } from "./languages.ts";
import type { AdaptiveAudioTrackInfo, AdaptiveFormat } from "./youtube-types.ts";

export function languageCodeFromTrackId(trackId: string): string {
  const beforeDot = trackId.split(".")[0] ?? trackId;
  const beforeDash = beforeDot.split("-")[0] ?? beforeDot;
  return beforeDash.toLowerCase();
}

export function isOriginalDisplayName(displayName: string): boolean {
  const lower = displayName.toLowerCase();
  return ORIGINAL_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function isOriginalTrackId(trackId: string): boolean {
  return /\.4$/.test(trackId) || trackId.includes(".4");
}

export function isOriginalAudioTrack(
  track: AdaptiveAudioTrackInfo,
  allTracks: ReadonlyArray<AdaptiveAudioTrackInfo>,
): boolean {
  if (track.isAutoDubbed === true) {
    return false;
  }
  if (isOriginalDisplayName(track.displayName)) {
    return true;
  }
  if (isOriginalTrackId(track.id)) {
    return true;
  }
  const hasAutoDubbedSibling = allTracks.some((other) => other.isAutoDubbed === true);
  if (hasAutoDubbedSibling && track.isAutoDubbed === false) {
    return true;
  }
  return false;
}

export function trackMatchesPreferredLanguage(
  track: AdaptiveAudioTrackInfo,
  preferredLanguages: ReadonlyArray<string>,
): boolean {
  const code = languageCodeFromTrackId(track.id);
  if (preferredLanguages.includes(code)) {
    return true;
  }

  const displayLower = track.displayName.toLowerCase();
  for (const preferred of preferredLanguages) {
    const definition = LANGUAGES.find((language) => language.code === preferred);
    if (definition === undefined) {
      continue;
    }
    if (displayLower.includes(definition.name.toLowerCase())) {
      return true;
    }
    if (definition.aliases.some((alias) => displayLower.includes(alias.toLowerCase()))) {
      return true;
    }
  }
  return false;
}

export function collectAudioTracks(formats: ReadonlyArray<AdaptiveFormat>): AdaptiveAudioTrackInfo[] {
  const tracks: AdaptiveAudioTrackInfo[] = [];
  for (const format of formats) {
    if (format.audioTrack !== undefined) {
      tracks.push(format.audioTrack);
    }
  }
  return tracks;
}

export function findPreferredOriginalTrack(
  formats: ReadonlyArray<AdaptiveFormat>,
  preferredLanguages: ReadonlyArray<string>,
): AdaptiveAudioTrackInfo | undefined {
  const tracks = collectAudioTracks(formats);
  if (tracks.length === 0) {
    return undefined;
  }

  const uniqueById = new Map<string, AdaptiveAudioTrackInfo>();
  for (const track of tracks) {
    if (!uniqueById.has(track.id)) {
      uniqueById.set(track.id, track);
    }
  }
  const uniqueTracks = [...uniqueById.values()];

  for (const track of uniqueTracks) {
    if (
      isOriginalAudioTrack(track, uniqueTracks) &&
      trackMatchesPreferredLanguage(track, preferredLanguages)
    ) {
      return track;
    }
  }
  return undefined;
}

export function applyDefaultAudioTrack(
  formats: AdaptiveFormat[],
  selectedTrackId: string,
): void {
  for (const format of formats) {
    if (format.audioTrack === undefined) {
      continue;
    }
    format.audioTrack.audioIsDefault = format.audioTrack.id === selectedTrackId;
  }
}
