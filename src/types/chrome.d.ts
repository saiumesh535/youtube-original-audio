/** Minimal Chrome extension API typings used by this project (no any/unknown). */

export type StorageChange = {
  readonly oldValue?: boolean | string | ReadonlyArray<string>;
  readonly newValue?: boolean | string | ReadonlyArray<string>;
};

export type StorageChanges = {
  readonly [key: string]: StorageChange | undefined;
};

export type StorageArea = {
  get(
    keys: ReadonlyArray<string> | string | null,
  ): Promise<Record<string, boolean | string | ReadonlyArray<string> | undefined>>;
  set(items: Record<string, boolean | string | ReadonlyArray<string>>): Promise<void>;
};

export type StorageOnChanged = {
  addListener(
    callback: (changes: StorageChanges, areaName: string) => void,
  ): void;
};

export type ChromeStorage = {
  readonly sync: StorageArea;
  readonly local: StorageArea;
  readonly onChanged: StorageOnChanged;
};

export type ChromeRuntime = {
  readonly lastError: { readonly message?: string } | undefined;
};

export type ChromeApi = {
  readonly storage: ChromeStorage;
  readonly runtime: ChromeRuntime;
};

declare global {
  // eslint-disable-next-line no-var
  var chrome: ChromeApi;
}

export {};
