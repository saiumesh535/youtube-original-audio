import type { ExtensionConfig } from "./languages.ts";
import { DEFAULT_CONFIG } from "./languages.ts";

export const STORAGE_ENABLED_KEY = "enabled" as const;
export const STORAGE_PREFERRED_LANGUAGES_KEY = "preferredLanguages" as const;

export type StoredSettings = {
  readonly enabled: boolean;
  readonly preferredLanguages: ReadonlyArray<string>;
};

function isStringArray(value: boolean | string | ReadonlyArray<string> | undefined): value is ReadonlyArray<string> {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function configFromStorage(
  raw: Record<string, boolean | string | ReadonlyArray<string> | undefined>,
): ExtensionConfig {
  const enabledValue = raw[STORAGE_ENABLED_KEY];
  const preferredValue = raw[STORAGE_PREFERRED_LANGUAGES_KEY];

  const enabled = typeof enabledValue === "boolean" ? enabledValue : DEFAULT_CONFIG.enabled;
  const preferredLanguages = isStringArray(preferredValue)
    ? preferredValue
    : DEFAULT_CONFIG.preferredLanguages;

  return {
    enabled,
    preferredLanguages,
  };
}

export function storagePayloadFromConfig(config: ExtensionConfig): Record<string, boolean | ReadonlyArray<string>> {
  return {
    [STORAGE_ENABLED_KEY]: config.enabled,
    [STORAGE_PREFERRED_LANGUAGES_KEY]: [...config.preferredLanguages],
  };
}
