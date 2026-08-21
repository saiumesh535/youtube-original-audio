import type { ChromeApi } from "../types/chrome.d.ts";

type ExtensionGlobals = typeof globalThis & {
  chrome?: ChromeApi;
  browser?: ChromeApi;
};

export function getExtensionApi(): ChromeApi {
  const globals = globalThis as ExtensionGlobals;
  if (globals.chrome?.storage !== undefined) {
    return globals.chrome;
  }
  if (globals.browser?.storage !== undefined) {
    return globals.browser;
  }
  throw new Error("Extension storage API is unavailable.");
}

export async function readExtensionStorage(
  keys: ReadonlyArray<string>,
): Promise<Record<string, boolean | string | ReadonlyArray<string> | undefined>> {
  const api = getExtensionApi();
  const empty: Record<string, boolean | string | ReadonlyArray<string> | undefined> = {};
  const [syncResult, localResult] = await Promise.all([
    api.storage.sync.get(keys).catch(() => empty),
    api.storage.local.get(keys).catch(() => empty),
  ]);

  const merged: Record<string, boolean | string | ReadonlyArray<string> | undefined> = {
    ...syncResult,
  };
  for (const key of keys) {
    if (merged[key] === undefined && localResult[key] !== undefined) {
      merged[key] = localResult[key];
    }
  }
  return merged;
}

export async function writeExtensionStorage(
  items: Record<string, boolean | string | ReadonlyArray<string>>,
): Promise<void> {
  const api = getExtensionApi();
  try {
    await api.storage.sync.set(items);
  } catch {
    // Firefox sync often requires an account.
  }
  await api.storage.local.set(items);
}
