import {
  CONFIG_MESSAGE_TYPE,
  type ExtensionConfig,
  type JsonMessageCandidate,
} from "../shared/languages.ts";
import { getExtensionApi, readExtensionStorage } from "../shared/extension-api.ts";
import {
  STORAGE_ENABLED_KEY,
  STORAGE_PREFERRED_LANGUAGES_KEY,
  configFromStorage,
} from "../shared/storage.ts";

const REQUEST_CONFIG_TYPE = "yt-original-audio-request-config";

function publishConfig(config: ExtensionConfig): void {
  const message = {
    source: "yt-original-audio" as const,
    type: CONFIG_MESSAGE_TYPE,
    config,
  };
  window.postMessage(message, "*");
}

async function loadAndPublish(): Promise<void> {
  const raw = await readExtensionStorage([
    STORAGE_ENABLED_KEY,
    STORAGE_PREFERRED_LANGUAGES_KEY,
  ]);
  publishConfig(configFromStorage(raw));
}

function isRequestConfigMessage(data: JsonMessageCandidate): boolean {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  const record = data as { source?: string; type?: string };
  return record.source === "yt-original-audio" && record.type === REQUEST_CONFIG_TYPE;
}

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) {
    return;
  }
  const candidate = event.data as JsonMessageCandidate;
  if (!isRequestConfigMessage(candidate)) {
    return;
  }
  void loadAndPublish();
});

getExtensionApi().storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" && areaName !== "local") {
    return;
  }
  if (
    changes[STORAGE_ENABLED_KEY] === undefined &&
    changes[STORAGE_PREFERRED_LANGUAGES_KEY] === undefined
  ) {
    return;
  }
  void loadAndPublish();
});

void loadAndPublish();
