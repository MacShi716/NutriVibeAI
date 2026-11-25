"use client";

import { useState } from "react";
import { DININGCODE_HOME, DININGCODE_SUGGESTIONS, diningCodeSearchUrl } from "@/lib/diningcode";

export default function DiningCodeCard({ compact }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const url = diningCodeSearchUrl(query);

  return (
    <section
      className={compact ? "rounded-xl border border-gray-200 bg-white p-4" : "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"}
      data-testid="diningcode-entry"
    >
      <h2 className="text-sm font-bold text-gray-900">외식 맛집 · 다이닝코드</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        밖에서 드실 때는 다이닝코드의 공개 검색 페이지로 이동합니다. 이 앱은 다이닝코드 계정이나 비공개 API를
        사용하지 않습니다.
      </p>
      <label className="mt-3 block text-xs text-gray-500" htmlFor="diningcode-query">
        지역 또는 음식 종류
        <input
          id="diningcode-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 강남 한식"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {DININGCODE_SUGGESTIONS.map((word) => (
          <button
            key={word}
            type="button"
            onClick={() => setQuery(word)}
            className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            {word}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
        >
          {query.trim() ? "다이닝코드에서 검색" : "다이닝코드 홈 열기"}
        </a>
        <a
          href={DININGCODE_HOME}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          내 근처 찾기
        </a>
      </div>
    </section>
  );
}
