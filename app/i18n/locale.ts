/**
 * UI language. Default is formal Korean. The choice stays in this browser
 * (nv-ui-locale) and is not part of the nutrivibe: backup payload.
 *
 * Add a language by extending Locale, LOCALES, and a messages file that
 * satisfies Messages. Feature copy (supplements, reminders, restaurant
 * suggestions) belongs in the same message tree, not in components.
 */

import { LOCALE_STORAGE_KEY } from "./theme";

export const LOCALES = ["ko", "zh", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export function parseLocale(value: string | null | undefined): Locale {
  if (value === "ko" || value === "zh" || value === "en") return value;
  return "ko";
}

export function htmlLang(locale: Locale): string {
  switch (locale) {
    case "ko":
      return "ko";
    case "zh":
      return "zh-CN";
    case "en":
      return "en";
    default: {
      const never: never = locale;
      return never;
    }
  }
}

export function dateLocale(locale: Locale): string {
  switch (locale) {
    case "ko":
      return "ko-KR";
    case "zh":
      return "zh-CN";
    case "en":
      return "en-US";
    default: {
      const never: never = locale;
      return never;
    }
  }
}

/**
 * Language names are endonyms so each option is recognizable.
 * On a Korean screen the Chinese option is the Korean word 중국어, so the
 * Korean UI does not mix in Chinese characters.
 */
export function localeOptionLabel(id: Locale, current: Locale): string {
  switch (id) {
    case "ko":
      return "한국어";
    case "en":
      return "English";
    case "zh":
      return current === "ko" ? "중국어" : "中文";
    default: {
      const never: never = id;
      return never;
    }
  }
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "ko";
  try {
    return parseLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return "ko";
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage failures; the current view still switches.
  }
}
