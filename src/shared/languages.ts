export type LanguageDefinition = {
  readonly code: string;
  readonly name: string;
  readonly aliases: ReadonlyArray<string>;
};

export const ORIGINAL_KEYWORDS: ReadonlyArray<string> = [
  "original",
  "originale",
  "originalny",
  "originalaudio",
  "origineel",
  "orijinal",
  "оригинал",
  "オリジナル",
  "원본",
  "原始",
  "मूल",
  "الأصلي",
] as const;

export const LANGUAGES: ReadonlyArray<LanguageDefinition> = [
  { code: "hi", name: "Hindi", aliases: ["hindi", "हिन्दी", "हिंदी"] },
  { code: "te", name: "Telugu", aliases: ["telugu", "తెలుగు"] },
  { code: "ta", name: "Tamil", aliases: ["tamil", "தமிழ்"] },
  { code: "bn", name: "Bengali / Bangla", aliases: ["bengali", "bangla", "বাংলা"] },
  { code: "mr", name: "Marathi", aliases: ["marathi", "मराठी"] },
  { code: "gu", name: "Gujarati", aliases: ["gujarati", "ગુજરાતી"] },
  { code: "kn", name: "Kannada", aliases: ["kannada", "ಕನ್ನಡ"] },
  { code: "ml", name: "Malayalam", aliases: ["malayalam", "മലയാളം"] },
  { code: "pa", name: "Punjabi", aliases: ["punjabi", "ਪੰਜਾਬੀ"] },
  { code: "ur", name: "Urdu", aliases: ["urdu", "اردو"] },
  { code: "en", name: "English", aliases: ["english"] },
  { code: "es", name: "Spanish", aliases: ["spanish", "español", "espanol"] },
  { code: "pt", name: "Portuguese", aliases: ["portuguese", "português", "portugues"] },
  { code: "fr", name: "French", aliases: ["french", "français", "francais"] },
  { code: "de", name: "German", aliases: ["german", "deutsch"] },
  { code: "it", name: "Italian", aliases: ["italian", "italiano"] },
  { code: "ja", name: "Japanese", aliases: ["japanese", "日本語"] },
  { code: "ko", name: "Korean", aliases: ["korean", "한국어"] },
  { code: "zh", name: "Chinese", aliases: ["chinese", "中文", "普通话", "國語"] },
  { code: "ru", name: "Russian", aliases: ["russian", "русский"] },
  { code: "ar", name: "Arabic", aliases: ["arabic", "العربية"] },
  { code: "tr", name: "Turkish", aliases: ["turkish", "türkçe", "turkce"] },
  { code: "id", name: "Indonesian", aliases: ["indonesian", "bahasa indonesia"] },
  { code: "th", name: "Thai", aliases: ["thai", "ไทย"] },
  { code: "vi", name: "Vietnamese", aliases: ["vietnamese", "tiếng việt"] },
  { code: "pl", name: "Polish", aliases: ["polish", "polski"] },
  { code: "nl", name: "Dutch", aliases: ["dutch", "nederlands"] },
  { code: "uk", name: "Ukrainian", aliases: ["ukrainian", "українська"] },
  { code: "he", name: "Hebrew", aliases: ["hebrew", "עברית"] },
] as const;

export const CONFIG_MESSAGE_TYPE = "yt-original-audio-config" as const;

export type ExtensionConfig = {
  readonly enabled: boolean;
  readonly preferredLanguages: ReadonlyArray<string>;
};

export const DEFAULT_CONFIG: ExtensionConfig = {
  enabled: true,
  preferredLanguages: ["hi"],
};

export type ConfigMessage = {
  readonly source: "yt-original-audio";
  readonly type: typeof CONFIG_MESSAGE_TYPE;
  readonly config: ExtensionConfig;
};

export function isConfigMessage(data: JsonMessageCandidate): data is ConfigMessage {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  const record = data as {
    source?: string;
    type?: string;
    config?: {
      enabled?: boolean;
      preferredLanguages?: ReadonlyArray<string>;
    };
  };
  if (record.source !== "yt-original-audio") {
    return false;
  }
  if (record.type !== CONFIG_MESSAGE_TYPE) {
    return false;
  }
  if (record.config === undefined) {
    return false;
  }
  if (typeof record.config.enabled !== "boolean") {
    return false;
  }
  if (!Array.isArray(record.config.preferredLanguages)) {
    return false;
  }
  return record.config.preferredLanguages.every((code) => typeof code === "string");
}

/** Narrow postMessage payloads without using any/unknown. */
export type JsonMessageCandidate =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonMessageCandidate>
  | { readonly [key: string]: JsonMessageCandidate | undefined };
