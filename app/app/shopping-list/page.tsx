"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUi } from "@/components/UiProvider";
import { categoryLabel, format, localizeMessage } from "@/i18n/text";
import { ko } from "@/i18n/messages/ko";
import { trackEvent } from "@/lib/gamification";
import DiningCodeCard from "@/components/DiningCodeCard";
import { ingredientExpiryMark } from "@/lib/pantry";
import { buildShoppingList, groupShoppingItems, mergeShoppingItems, type ShoppingItem } from "@/lib/shopping";
import { storage } from "@/lib/storage";
import type { PantryItem } from "@/lib/types";

export default function ShoppingListPage() {
  const { t } = useUi();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mergedFav, setMergedFav] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const result = storage.getLastResult();
    const saved = storage.getShopping();
    if (saved.items.length > 0) {
      setItems(saved.items);
    } else if (result && result.recipes.length > 0) {
      const lists = result.recipes.map((r) => buildShoppingList(r.ingredients, result.conditions.ingredients));
      setItems(mergeShoppingItems(lists));
    }
    setPantry(storage.getPantry());
    setLoaded(true);
  }, []);

  function addFavoritesToShopping() {
    const favs = storage.getFavorites();
    if (favs.length === 0) {
      setError(ko.errors.noFavorites);
      return;
    }
    const ownedRaw = storage.getLastResult()?.conditions.ingredients ?? "";
    const favItems = mergeShoppingItems(favs.map((r) => buildShoppingList(r.ingredients, ownedRaw)));
    const next = mergeShoppingItems([items, favItems]);
    setItems(next);
    storage.saveShopping(next);
    setMergedFav(true);
    setError("");
    setTimeout(() => setMergedFav(false), 2000);
  }

  const checkedCount = useMemo(() => items.filter((i) => i.checked).length, [items]);
  const groups = useMemo(() => groupShoppingItems(items), [items]);

  function toggle(name: string) {
    const prev = items.find((i) => i.name === name);
    const next = items.map((i) => (i.name === name ? { ...i, checked: !i.checked } : i));
    setItems(next);
    storage.saveShopping(next);
    if (prev && !prev.checked) trackEvent({ type: "shoppingCheck" });
  }

  function saveAll() {
    storage.saveShopping(items);
  }

  async function copyText() {
    const text = groups
      .map((g) => {
        const head = `[${categoryLabel(t, g.key, g.label)}]`;
        const lines = g.items.map((i) => `☐ ${i.name} ${i.amount}`);
        return [head, ...lines].join("\n");
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한 없음 등 — 무시
    }
  }

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t.shopping.title}</h1>
        <Link href="/recipes" className="text-sm text-brand-600 hover:underline">
          {t.common.backToRecipes}
        </Link>
      </div>

      {error && <p className="nv-error mb-3">{localizeMessage(error, t)}</p>}

      {items.length === 0 ? (
        <div className="nv-card nv-empty p-10">
          <p className="text-gray-600">{t.shopping.empty}</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <Link
              href="/meal-plan"
              data-testid="shopping-merge-weekly"
              className="nv-btn inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              {t.shopping.mergeWeekly}
            </Link>
            <Link href="/" className="nv-press text-sm font-medium text-brand-700 underline">
              {t.common.enterConditions}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600">
            {format(t.shopping.progress, { checked: checkedCount, total: items.length })}
          </p>

          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.key} className="nv-card p-4">
                <h2 className="mb-2 text-sm font-bold text-gray-700">{categoryLabel(t, g.key, g.label)}</h2>
                <ul className="nv-stagger space-y-1">
                  {g.items.map((item) => {
                    const expiryMark = ingredientExpiryMark(item.name, pantry);
                    return (
                      <li key={item.name}>
                        <label className="nv-row flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggle(item.name)}
                            className="h-4 w-4 accent-brand-600"
                          />
                          <span className={`flex-1 text-sm ${item.checked ? "text-gray-400 line-through" : "text-gray-800"}`}>
                            {item.name}
                          </span>
                          {expiryMark === "expired" && (
                            <span className="text-[11px] font-semibold text-red-600">{t.expiry.expiredLong}</span>
                          )}
                          {expiryMark === "soon" && (
                            <span className="text-[11px] font-semibold text-amber-700">{t.expiry.soon}</span>
                          )}
                          <span className="text-xs text-gray-500">{item.amount}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={saveAll}
              className="nv-btn flex-1 rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700"
            >
              {t.shopping.save}
            </button>
            <button
              onClick={copyText}
              className="nv-btn-secondary flex-1 rounded-lg border border-brand-600 px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              {copied ? t.shopping.copied : t.shopping.copy}
            </button>
          </div>
          <div className="mt-3">
            <button
              onClick={addFavoritesToShopping}
              className="nv-btn-secondary w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-brand-400 hover:text-brand-700"
            >
              {mergedFav ? t.shopping.merged : t.shopping.mergeFav}
            </button>
            <p className="mt-1.5 text-xs text-gray-400">{t.shopping.mergeNote}</p>
          </div>
        </>
      )}
      <div className="mt-6 space-y-3">
        <p className="text-xs text-gray-500">
          {t.shopping.reminderLead}{" "}
          <Link href="/supplements" className="font-medium text-brand-700 underline">
            {t.shopping.reminderLink}
          </Link>{" "}
          {t.shopping.reminderTail}
        </p>
        <DiningCodeCard compact />
      </div>
    </div>
  );
}
