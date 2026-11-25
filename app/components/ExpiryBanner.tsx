"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUi } from "@/components/UiProvider";
import { format } from "@/i18n/text";
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
  const { t } = useUi();
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
  const shown = (names: string[]) =>
    names.length > 6 ? format(t.expiryBanner.more, { names: names.slice(0, 6).join(", "), n: names.length - 6 }) : names.join(", ");

  return (
    <div className="border-b border-amber-200 bg-amber-50" data-testid="expiry-banner">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-2 text-xs text-amber-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p>
            <span className="font-semibold">{t.expiryBanner.title} </span>
            {expired.length > 0 && <span>{format(t.expiryBanner.expired, { names: shown(expired) })} </span>}
            {soon.length > 0 && <span>{format(t.expiryBanner.soon, { names: shown(soon) })} </span>}
            {t.expiryBanner.hint}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="expiry-priority"
              className="rounded-md border border-amber-300 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-70"
              onClick={enablePriority}
              disabled={priorityOn}
            >
              {priorityOn ? t.expiryBanner.priorityOn : t.expiryBanner.priorityOff}
            </button>
            <Link href="/meal-plan" className="rounded-md px-2 py-1 font-medium text-amber-800 underline">
              {t.expiryBanner.openPlan}
            </Link>
          </div>
        </div>
        <button type="button" className="shrink-0 self-start text-amber-700 underline" onClick={() => setHidden(true)}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}
