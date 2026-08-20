import { LANGUAGES, type ExtensionConfig } from "../shared/languages.ts";
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

const enabledInput = requireElement("enabled", isHTMLInputElement);
const languageList = requireElement("language-list", isHTMLDivElement);
const status = requireElement("status", isHTMLParagraphElement);

let saveTimer: number | undefined;

function selectedLanguageCodes(): string[] {
  const checked = languageList.querySelectorAll<HTMLInputElement>("input[type='checkbox']:checked");
  const codes: string[] = [];
  checked.forEach((input) => {
    codes.push(input.value);
  });
  return codes;
}

function currentConfig(): ExtensionConfig {
  return {
    enabled: enabledInput.checked,
    preferredLanguages: selectedLanguageCodes(),
  };
}

function setStatus(message: string): void {
  status.textContent = message;
  status.classList.toggle("saved", message.length > 0);
}

async function persist(): Promise<void> {
  const config = currentConfig();
  await chrome.storage.sync.set(storagePayloadFromConfig(config));
  setStatus("Saved");
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    setStatus("");
  }, 1200);
}

function renderLanguages(preferredLanguages: ReadonlyArray<string>): void {
  languageList.replaceChildren();
  for (const language of LANGUAGES) {
    const label = document.createElement("label");
    label.className = "language-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = language.code;
    checkbox.checked = preferredLanguages.includes(language.code);
    checkbox.addEventListener("change", () => {
      void persist();
    });

    const text = document.createElement("span");
    text.textContent = language.name;

    label.append(checkbox, text);
    languageList.append(label);
  }
}

async function init(): Promise<void> {
  const raw = await chrome.storage.sync.get([
    STORAGE_ENABLED_KEY,
    STORAGE_PREFERRED_LANGUAGES_KEY,
  ]);
  const config = configFromStorage(raw);
  enabledInput.checked = config.enabled;
  renderLanguages(config.preferredLanguages);

  enabledInput.addEventListener("change", () => {
    void persist();
  });
}

void init();
