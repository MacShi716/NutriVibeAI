"use client";

import { useState } from "react";
import { useUi } from "@/components/UiProvider";
import { DININGCODE_HOME, DININGCODE_SUGGESTIONS, diningCodeSearchUrl } from "@/lib/diningcode";

export default function DiningCodeCard({ compact }: { compact?: boolean }) {
  const { t } = useUi();
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const url = diningCodeSearchUrl(searchQuery || query);
  const labels: Record<(typeof DININGCODE_SUGGESTIONS)[number], string> = {
    한식: t.dining.suggestKorean,
    점심: t.dining.suggestLunch,
    분식: t.dining.suggestSnack,
    백반: t.dining.suggestSet,
  };

  return (
    <section
      className={compact ? "nv-card nv-card--compact p-4" : "nv-card nv-card-hover p-5"}
      data-testid="diningcode-entry"
    >
      <h2 className="text-sm font-bold text-gray-900">{t.dining.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.dining.body}</p>
      <label className="mt-3 block text-xs text-gray-500" htmlFor="diningcode-query">
        {t.dining.queryLabel}
        <input
          id="diningcode-query"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchQuery(e.target.value);
          }}
          placeholder={t.dining.placeholder}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </label>
      <div className="nv-stagger mt-2 flex flex-wrap gap-2">
        {DININGCODE_SUGGESTIONS.map((word) => (
          <button
            key={word}
            type="button"
            onClick={() => {
              setQuery(labels[word]);
              setSearchQuery(word);
            }}
            className="nv-chip px-3 py-1 text-xs text-gray-600"
          >
            {labels[word]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="nv-btn inline-flex rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
        >
          {query.trim() ? t.dining.search : t.dining.home}
        </a>
        <a
          href={DININGCODE_HOME}
          target="_blank"
          rel="noreferrer"
          className="nv-btn-secondary inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          {t.dining.nearby}
        </a>
      </div>
    </section>
  );
}
