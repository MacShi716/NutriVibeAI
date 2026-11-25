"use client";

import { LOCALES, localeOptionLabel, type Locale } from "@/i18n/locale";
import { useUi } from "./UiProvider";

export default function LanguageSelect() {
  const { locale, setLocale, t } = useUi();
  return (
    <label className="language-select">
      <span className="language-select__label">{t.language.label}</span>
      <select
        value={locale}
        aria-label={t.language.label}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {LOCALES.map((id) => (
          <option key={id} value={id}>
            {localeOptionLabel(id, locale)}
          </option>
        ))}
      </select>
    </label>
  );
}
