"use client";

import { useEffect, useState } from "react";
import { useUi } from "@/components/UiProvider";
import { expiryState, PANTRY_EVENT, syncPantry, type ExpiryState } from "@/lib/pantry";
import { storage } from "@/lib/storage";
import type { PantryItem } from "@/lib/types";

function expiryText(state: ExpiryState, labels: { ok: string; soon: string; expired: string }): string {
  switch (state) {
    case "none":
      return "";
    case "ok":
      return labels.ok;
    case "soon":
      return labels.soon;
    case "expired":
      return labels.expired;
    default: {
      const never: never = state;
      return never;
    }
  }
}

export default function PantryEditor({
  names,
  prioritize,
  onPrioritize,
}: {
  names: string[];
  prioritize: boolean;
  onPrioritize: (value: boolean) => void;
}) {
  const { t } = useUi();
  const [items, setItems] = useState<PantryItem[]>([]);
  const namesKey = names.join("\n");

  useEffect(() => {
    const parsed = namesKey ? namesKey.split("\n") : [];
    const next = syncPantry(parsed, storage.getPantry());
    storage.savePantry(next);
    setItems(next);
    window.dispatchEvent(new Event(PANTRY_EVENT));
  }, [namesKey]);

  function update(index: number, field: "amount" | "purchasedOn" | "expiresOn", value: string) {
    const next = items.map((item, i) => (i === index ? { ...item, [field]: value || null } : item));
    setItems(next);
    storage.savePantry(next);
    window.dispatchEvent(new Event(PANTRY_EVENT));
  }

  if (names.length === 0) {
    return <p className="mt-2 text-xs text-gray-400">{t.pantry.empty}</p>;
  }

  return (
    <div className="mt-3 space-y-2" data-testid="pantry-editor">
      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-brand-600"
          checked={prioritize}
          onChange={(e) => onPrioritize(e.target.checked)}
        />
        <span>{t.pantry.prioritize}</span>
      </label>
      <ul className="space-y-2">
        {items.map((item, index) => {
          const state = expiryState(item.expiresOn);
          const badge = expiryText(state, t.expiry);
          return (
            <li key={`${item.name}-${index}`} className="nv-inset px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">{item.name}</span>
                {badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      state === "expired"
                        ? "bg-red-50 text-red-600"
                        : state === "soon"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <label className="mt-2 block text-[11px] text-gray-500">
                {t.pantry.amount}
                <input
                  type="text"
                  value={item.amount ?? ""}
                  onChange={(e) => update(index, "amount", e.target.value)}
                  placeholder={t.pantry.amountPlaceholder}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                />
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-[11px] text-gray-500">
                  {t.pantry.purchased}
                  <input
                    type="date"
                    value={item.purchasedOn ?? ""}
                    onChange={(e) => update(index, "purchasedOn", e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                  />
                </label>
                <label className="text-[11px] text-gray-500">
                  {t.pantry.expires}
                  <input
                    type="date"
                    value={item.expiresOn ?? ""}
                    onChange={(e) => update(index, "expiresOn", e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
