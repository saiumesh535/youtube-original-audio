import { LANGUAGES, type ExtensionConfig, type LanguageDefinition } from "../shared/languages.ts";
import { readExtensionStorage, writeExtensionStorage } from "../shared/extension-api.ts";
import {
  STORAGE_ENABLED_KEY,
  STORAGE_PREFERRED_LANGUAGES_KEY,
  configFromStorage,
  storagePayloadFromConfig,
} from "../shared/storage.ts";

function requireElement<T extends HTMLElement>(id: string, guard: (node: HTMLElement) => node is T): T {
  const element = document.getElementById(id);
  if (element === null || !guard(element)) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

function isHTMLInputElement(node: HTMLElement): node is HTMLInputElement {
  return node instanceof HTMLInputElement;
}

function isHTMLDivElement(node: HTMLElement): node is HTMLDivElement {
  return node instanceof HTMLDivElement;
}

function isHTMLParagraphElement(node: HTMLElement): node is HTMLParagraphElement {
  return node instanceof HTMLParagraphElement;
}

function isHTMLSpanElement(node: HTMLElement): node is HTMLSpanElement {
  return node instanceof HTMLSpanElement;
}

const enabledInput = requireElement("enabled", isHTMLInputElement);
const enabledLabel = requireElement("enabled-label", isHTMLSpanElement);
const languageSearch = requireElement("language-search", isHTMLInputElement);
const languageList = requireElement("language-list", isHTMLDivElement);
const languageThumb = requireElement("language-thumb", isHTMLDivElement);
const languageEmpty = requireElement("language-empty", isHTMLParagraphElement);
const status = requireElement("status", isHTMLParagraphElement);

const languageRailElement = languageThumb.parentElement;
if (languageRailElement === null || !(languageRailElement instanceof HTMLElement)) {
  throw new Error("Missing language scrollbar rail");
}
const languageRail: HTMLElement = languageRailElement;

let saveTimer: number | undefined;

function syncLanguageScrollbar(): void {
  const view = languageList.clientHeight;
  const full = languageList.scrollHeight;
  const railHeight = languageRail.clientHeight;

  if (full <= view + 1 || railHeight <= 0) {
    languageRail.dataset["idle"] = "true";
    return;
  }

  languageRail.dataset["idle"] = "false";
  const thumbHeight = Math.max(24, (view / full) * railHeight);
  const maxTop = railHeight - thumbHeight;
  const maxScroll = full - view;
  const top = maxScroll <= 0 ? 0 : (languageList.scrollTop / maxScroll) * maxTop;
  languageThumb.style.height = `${String(thumbHeight)}px`;
  languageThumb.style.transform = `translateY(${String(top)}px)`;
}

function selectedLanguageCodes(): string[] {
  const pressed = languageList.querySelectorAll<HTMLButtonElement>("button.lang-row[aria-pressed='true']");
  const codes: string[] = [];
  pressed.forEach((button) => {
    codes.push(button.value);
  });
  return codes;
}

function currentConfig(): ExtensionConfig {
  return {
    enabled: enabledInput.checked,
    preferredLanguages: selectedLanguageCodes(),
  };
}

function syncEnabledLabel(): void {
  enabledLabel.textContent = enabledInput.checked ? "On" : "Off";
}

function setStatus(message: string): void {
  status.textContent = message;
  status.classList.toggle("saved", message.length > 0);
}

async function persist(): Promise<void> {
  await writeExtensionStorage(storagePayloadFromConfig(currentConfig()));
  setStatus("Saved");
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    setStatus("");
  }, 900);
}

function languageMatches(language: LanguageDefinition, query: string): boolean {
  if (query.length === 0) {
    return true;
  }
  const haystack = [language.code, language.name, ...language.aliases].join(" ").toLowerCase();
  return haystack.includes(query);
}

function applySearchFilter(): void {
  const query = languageSearch.value.trim().toLowerCase();
  const rows = languageList.querySelectorAll<HTMLButtonElement>("button.lang-row");
  let visible = 0;
  rows.forEach((row) => {
    const language = LANGUAGES.find((item) => item.code === row.value);
    const show = language !== undefined && languageMatches(language, query);
    row.hidden = !show;
    if (show) {
      visible += 1;
    }
  });
  languageEmpty.hidden = visible > 0;
  syncLanguageScrollbar();
}

function renderLanguages(preferredLanguages: ReadonlyArray<string>): void {
  languageList.replaceChildren();
  const selected = LANGUAGES.filter((language) => preferredLanguages.includes(language.code));
  const rest = LANGUAGES.filter((language) => !preferredLanguages.includes(language.code));
  const ordered = [...selected, ...rest];

  for (const language of ordered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lang-row";
    button.value = language.code;
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-pressed", preferredLanguages.includes(language.code) ? "true" : "false");

    const name = document.createElement("span");
    name.textContent = language.name;

    const dot = document.createElement("span");
    dot.className = "lang-dot";
    dot.setAttribute("aria-hidden", "true");

    button.append(name, dot);
    button.addEventListener("click", () => {
      const next = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", next ? "true" : "false");
      void persist();
    });
    languageList.append(button);
  }
  applySearchFilter();
  syncLanguageScrollbar();
}

async function init(): Promise<void> {
  const raw = await readExtensionStorage([STORAGE_ENABLED_KEY, STORAGE_PREFERRED_LANGUAGES_KEY]);
  const config = configFromStorage(raw);
  enabledInput.checked = config.enabled;
  syncEnabledLabel();
  renderLanguages(config.preferredLanguages);

  enabledInput.addEventListener("change", () => {
    syncEnabledLabel();
    void persist();
  });
  languageSearch.addEventListener("input", () => {
    applySearchFilter();
  });
  languageList.addEventListener("scroll", () => {
    syncLanguageScrollbar();
  });
  window.addEventListener("resize", () => {
    syncLanguageScrollbar();
  });
  languageSearch.focus();
  syncLanguageScrollbar();
}

void init();
