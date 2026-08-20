import type {
  AdaptiveFormat,
  PlayerResponse,
  YtPlayerUserSettingsData,
  YtPlayerUserSettingsPayload,
} from "./youtube-types.ts";
import {
  isJsonObject,
  parseJsonValue,
  readArray,
  readBoolean,
  readObject,
  readString,
  type JsonObject,
  type JsonValue,
} from "./json.ts";

function parseAdaptiveAudioTrack(value: JsonValue): AdaptiveFormat["audioTrack"] | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }
  const id = readString(value, "id");
  const displayName = readString(value, "displayName");
  const audioIsDefault = readBoolean(value, "audioIsDefault");
  if (id === undefined || displayName === undefined || audioIsDefault === undefined) {
    return undefined;
  }
  const isAutoDubbed = readBoolean(value, "isAutoDubbed");
  if (isAutoDubbed === undefined) {
    return { id, displayName, audioIsDefault };
  }
  return { id, displayName, audioIsDefault, isAutoDubbed };
}

function parseAdaptiveFormat(value: JsonValue): AdaptiveFormat | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }
  const mimeType = readString(value, "mimeType");
  if (mimeType === undefined) {
    return undefined;
  }
  const audioTrackValue = value["audioTrack"];
  const audioTrack =
    audioTrackValue === undefined ? undefined : parseAdaptiveAudioTrack(audioTrackValue);

  if (audioTrack === undefined) {
    return { mimeType };
  }
  return { mimeType, audioTrack };
}

export function playerResponseFromJson(root: JsonObject): PlayerResponse | undefined {
  const streamingDataObject = readObject(root, "streamingData");
  const videoDetailsObject = readObject(root, "videoDetails");

  let streamingData: PlayerResponse["streamingData"];
  if (streamingDataObject !== undefined) {
    const formatsValue = readArray(streamingDataObject, "adaptiveFormats");
    if (formatsValue === undefined) {
      return undefined;
    }
    const adaptiveFormats: AdaptiveFormat[] = [];
    for (const item of formatsValue) {
      const format = parseAdaptiveFormat(item);
      if (format !== undefined) {
        adaptiveFormats.push(format);
      }
    }
    streamingData = { adaptiveFormats };
  }

  let videoDetails: PlayerResponse["videoDetails"];
  if (videoDetailsObject !== undefined) {
    const videoId = readString(videoDetailsObject, "videoId");
    const title = readString(videoDetailsObject, "title");
    if (videoId !== undefined && title !== undefined) {
      videoDetails = { videoId, title };
    }
  }

  if (streamingData !== undefined && videoDetails !== undefined) {
    return { streamingData, videoDetails };
  }
  if (streamingData !== undefined) {
    return { streamingData };
  }
  if (videoDetails !== undefined) {
    return { videoDetails };
  }
  return {};
}

export function parsePlayerResponseText(text: string): PlayerResponse | undefined {
  const value = parseJsonValue(text);
  if (!isJsonObject(value)) {
    return undefined;
  }
  return playerResponseFromJson(value);
}

export function serializePlayerResponse(response: PlayerResponse, originalText: string): string {
  const original = parseJsonValue(originalText);
  if (!isJsonObject(original)) {
    return originalText;
  }
  if (response.streamingData === undefined) {
    return originalText;
  }

  // Rebuild from a mutable clone of the original object graph via JSON round-trip.
  const clonedValue = parseJsonValue(JSON.stringify(original));
  if (!isJsonObject(clonedValue)) {
    return originalText;
  }

  const mutableRoot = structuredClone(clonedValue) as {
    streamingData?: {
      adaptiveFormats?: Array<{
        mimeType?: string;
        audioTrack?: {
          id?: string;
          displayName?: string;
          audioIsDefault?: boolean;
          isAutoDubbed?: boolean;
        };
      }>;
    };
    videoDetails?: { videoId?: string; title?: string };
  };

  if (mutableRoot.streamingData?.adaptiveFormats === undefined) {
    return originalText;
  }

  const selectedDefaults = new Map<string, boolean>();
  for (const format of response.streamingData.adaptiveFormats) {
    if (format.audioTrack !== undefined) {
      selectedDefaults.set(format.audioTrack.id, format.audioTrack.audioIsDefault);
    }
  }

  for (const format of mutableRoot.streamingData.adaptiveFormats) {
    if (format.audioTrack?.id === undefined) {
      continue;
    }
    const nextDefault = selectedDefaults.get(format.audioTrack.id);
    if (nextDefault !== undefined) {
      format.audioTrack.audioIsDefault = nextDefault;
    }
  }

  return JSON.stringify(mutableRoot);
}

export function parseYtPlayerUserSettings(raw: string): YtPlayerUserSettingsPayload | undefined {
  const outer = parseJsonValue(raw);
  if (!isJsonObject(outer)) {
    return undefined;
  }
  const creation = outer["creation"];
  const expiration = outer["expiration"];
  const data = outer["data"];
  if (typeof creation !== "number" || typeof expiration !== "number" || typeof data !== "string") {
    return undefined;
  }
  return { creation, expiration, data };
}

export function parseYtPlayerUserSettingsData(data: string): YtPlayerUserSettingsData | undefined {
  const value = parseJsonValue(data);
  if (!isJsonObject(value)) {
    return undefined;
  }
  const result: YtPlayerUserSettingsData = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined || !isJsonObject(entry)) {
      continue;
    }
    const stringValue = readString(entry, "stringValue");
    if (stringValue !== undefined) {
      result[key] = { stringValue };
    }
  }
  return result;
}
