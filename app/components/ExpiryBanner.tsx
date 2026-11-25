"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { expiryState, PANTRY_EVENT } from "@/lib/pantry";
import { storage } from "@/lib/storage";
import type { PantryItem, UserConditions } from "@/lib/types";

const EMPTY: UserConditions = {
  ingredients: "",
  preferences: "",
  restrictions: "",
  servings: 2,
  cookMinutes: 20,
  goalCalories: null,
  goalProtein: null,
  prioritizeExpiring: false,
};

export default function ExpiryBanner() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [hidden, setHidden] = useState(false);
  const [priorityOn, setPriorityOn] = useState(false);

  useEffect(() => {
    const load = () => {
      setItems(storage.getPantry());
      setPriorityOn(Boolean(storage.getConditions()?.prioritizeExpiring));
    };
    load();
    window.addEventListener(PANTRY_EVENT, load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener(PANTRY_EVENT, load);
      window.removeEventListener("focus", load);
    };
  }, []);

  function enablePriority() {
    const current = storage.getConditions();
    storage.saveConditions({ ...(current ?? EMPTY), prioritizeExpiring: true });
    setPriorityOn(true);
  }

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
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-2 text-xs text-amber-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p>
            <span className="font-semibold">유통기한 안내. </span>
            {expired.length > 0 && <span>기한이 지난 재료: {shown(expired)}. </span>}
            {soon.length > 0 && <span>곧 소비하면 좋은 재료: {shown(soon)}. </span>}
            주간 식단에서 이 재료를 먼저 쓰도록 할 수 있습니다.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="expiry-priority"
              className="rounded-md border border-amber-300 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-70"
              onClick={enablePriority}
              disabled={priorityOn}
            >
              {priorityOn ? "임박 재료 우선 추천 켜짐" : "임박 재료 우선 추천 켜기"}
            </button>
            <Link href="/meal-plan" className="rounded-md px-2 py-1 font-medium text-amber-800 underline">
              주간 식단 보기
            </Link>
          </div>
        </div>
        <button type="button" className="shrink-0 self-start text-amber-700 underline" onClick={() => setHidden(true)}>
          닫기
        </button>
      </div>
    </div>
  );
}
