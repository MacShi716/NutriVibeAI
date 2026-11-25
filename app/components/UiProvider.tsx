"use client";

import { createContext, useContext, useLayoutEffect, useSyncExternalStore } from "react";
import { messagesFor } from "@/i18n/catalog";
import { htmlLang, parseLocale, readStoredLocale, writeStoredLocale, type Locale } from "@/i18n/locale";
import {
  applyTheme,
  parseTheme,
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
  type ThemeChoice,
} from "@/i18n/theme";
import type { Messages } from "@/i18n/messages/types";

type UiValue = {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
};

const UiContext = createContext<UiValue | null>(null);

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

let cached = "ko|light";

function currentSnapshot(): string {
  const locale = readStoredLocale();
  const theme = resolveTheme(readStoredTheme(), prefersDark());
  return `${locale}|${theme}`;
}

function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => onStoreChange();
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("nv-ui", onStoreChange);
  media.addEventListener("change", onMedia);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("nv-ui", onStoreChange);
    media.removeEventListener("change", onMedia);
  };
}

function getSnapshot(): string {
  const next = currentSnapshot();
  if (next !== cached) cached = next;
  return cached;
}

function getServerSnapshot(): string {
  return "ko|light";
}

function emit(): void {
  window.dispatchEvent(new Event("nv-ui"));
}

export function UiProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [localePart, themePart] = raw.split("|");
  const locale = parseLocale(localePart);
  const theme = parseTheme(themePart) ?? "light";
  const t = messagesFor(locale);

  useLayoutEffect(() => {
    const storedLocale = readStoredLocale();
    const storedTheme = resolveTheme(readStoredTheme(), prefersDark());
    document.documentElement.lang = htmlLang(storedLocale);
    document.documentElement.dataset.locale = storedLocale;
    applyTheme(storedTheme);
    const messages = messagesFor(storedLocale);
    document.title = messages.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", messages.meta.description);
    if (locale === storedLocale) document.body.classList.add("locale-ready");
  }, [locale]);

  const value: UiValue = {
    locale,
    t,
    theme,
    setLocale: (next) => {
      writeStoredLocale(next);
      document.documentElement.lang = htmlLang(next);
      document.documentElement.dataset.locale = next;
      document.title = messagesFor(next).meta.title;
      document.querySelector('meta[name="description"]')?.setAttribute("content", messagesFor(next).meta.description);
      emit();
    },
    setTheme: (next) => {
      writeStoredTheme(next);
      applyTheme(next);
      emit();
    },
  };

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiValue {
  const value = useContext(UiContext);
  if (!value) throw new Error("useUi must be used within UiProvider");
  return value;
}
