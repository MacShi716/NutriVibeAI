"use client";

import { useEffect, useState } from "react";
import { expiryState, PANTRY_EVENT } from "@/lib/pantry";
import { storage } from "@/lib/storage";
import type { PantryItem } from "@/lib/types";

export default function ExpiryBanner() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const load = () => setItems(storage.getPantry());
    load();
    window.addEventListener(PANTRY_EVENT, load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener(PANTRY_EVENT, load);
      window.removeEventListener("focus", load);
    };
  }, []);

  if (hidden) return null;
  const flagged = items.filter((item) => {
    const state = expiryState(item.expiresOn);
    return state === "soon" || state === "expired";
  });
  if (flagged.length === 0) return null;

  const expired = flagged.filter((item) => expiryState(item.expiresOn) === "expired").map((item) => item.name);
  const soon = flagged.filter((item) => expiryState(item.expiresOn) === "soon").map((item) => item.name);
  const shown = (names: string[]) => (names.length > 6 ? `${names.slice(0, 6).join(", ")} 외 ${names.length - 6}개` : names.join(", "));

  return (
    <div className="border-b border-amber-200 bg-amber-50" data-testid="expiry-banner">
      <div className="mx-auto flex max-w-4xl items-start justify-between gap-3 px-4 py-2 text-xs text-amber-800">
        <p>
          <span className="font-semibold">유통기한 안내. </span>
          {expired.length > 0 && <span>기한이 지난 재료: {shown(expired)}. </span>}
          {soon.length > 0 && <span>곧 소비하면 좋은 재료: {shown(soon)}. </span>}
          홈에서 임박 재료를 우선 추천하도록 켤 수 있습니다.
        </p>
        <button type="button" className="shrink-0 text-amber-700 underline" onClick={() => setHidden(true)}>
          닫기
        </button>
      </div>
    </div>
  );
}
