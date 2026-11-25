"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { storage } from "@/lib/storage";
import { ingredientExpiryMark } from "@/lib/pantry";
import {
  buildShoppingList,
  groupShoppingItems,
  mergeShoppingItems,
} from "@/lib/shopping";
import { trackEvent } from "@/lib/gamification";
import type { ShoppingItem } from "@/lib/shopping";
import DiningCodeCard from "@/components/DiningCodeCard";
import type { PantryItem } from "@/lib/types";

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mergedFav, setMergedFav] = useState(false);

  useEffect(() => {
    const result = storage.getLastResult();
    const saved = storage.getShopping();
    if (saved.items.length > 0) {
      setItems(saved.items);
    } else if (result && result.recipes.length > 0) {
      const lists = result.recipes.map((r) =>
        buildShoppingList(r.ingredients, result.conditions.ingredients)
      );
      setItems(mergeShoppingItems(lists));
    }
    setPantry(storage.getPantry());
    setLoaded(true);
  }, []);

  function addFavoritesToShopping() {
    const favs = storage.getFavorites();
    if (favs.length === 0) {
      alert("즐겨찾기한 레시피가 없습니다.");
      return;
    }
    const ownedRaw = storage.getLastResult()?.conditions.ingredients ?? "";
    const favItems = mergeShoppingItems(
      favs.map((r) => buildShoppingList(r.ingredients, ownedRaw))
    );
    const next = mergeShoppingItems([items, favItems]);
    setItems(next);
    storage.saveShopping(next);
    setMergedFav(true);
    setTimeout(() => setMergedFav(false), 2000);
  }

  const checkedCount = useMemo(
    () => items.filter((i) => i.checked).length,
    [items]
  );

  const groups = useMemo(() => groupShoppingItems(items), [items]);

  function toggle(name: string) {
    const prev = items.find((i) => i.name === name);
    const next = items.map((i) =>
      i.name === name ? { ...i, checked: !i.checked } : i
    );
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
        const head = `[${g.label}]`;
        const lines = g.items.map(
          (i) => `☐ ${i.name} ${i.amount}`
        );
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
        <h1 className="text-xl font-bold text-gray-900">쇼핑리스트</h1>
        <Link href="/recipes" className="text-sm text-brand-600 hover:underline">
          레시피로 돌아가기
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-gray-600">
            누락된 식재료가 없거나 아직 생성된 레시피가 없습니다.
          </p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <Link
              href="/meal-plan"
              data-testid="shopping-merge-weekly"
              className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              주간 식단에서 장보기 합치기
            </Link>
            <Link href="/" className="text-sm font-medium text-brand-700 underline">
              조건 입력하러 가기
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600">
            보유 식재료를 제외하고 구매가 필요한 항목입니다. (
            {checkedCount}/{items.length} 체크 완료)
          </p>

          <div className="space-y-4">
            {groups.map((g) => (
              <div
                key={g.key}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <h2 className="mb-2 text-sm font-bold text-gray-700">{g.label}</h2>
                <ul className="space-y-1">
                  {g.items.map((item) => {
                    const expiryMark = ingredientExpiryMark(item.name, pantry);
                    return (
                      <li key={item.name}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggle(item.name)}
                            className="h-4 w-4 accent-brand-600"
                          />
                          <span
                            className={`flex-1 text-sm ${
                              item.checked ? "text-gray-400 line-through" : "text-gray-800"
                            }`}
                          >
                            {item.name}
                          </span>
                          {expiryMark === "expired" && (
                            <span className="text-[11px] font-semibold text-red-600">기한 지남</span>
                          )}
                          {expiryMark === "soon" && (
                            <span className="text-[11px] font-semibold text-amber-700">임박</span>
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
              className="flex-1 rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700"
            >
              구매 항목 저장
            </button>
            <button
              onClick={copyText}
              className="flex-1 rounded-lg border border-brand-600 px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              {copied ? "복사됨 ✓" : "목록 복사"}
            </button>
          </div>
          <div className="mt-3">
            <button
              onClick={addFavoritesToShopping}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-brand-400 hover:text-brand-700"
            >
              {mergedFav
                ? "즐겨찾기 레시피 통합 완료 ✓"
                : "즐겨찾기 레시피 장보기 통합 추가"}
            </button>
            <p className="mt-1.5 text-xs text-gray-400">
              즐겨찾기한 레시피의 재료를 보유 식재료 기준으로 걸러 현재 목록에
              병합합니다.
            </p>
          </div>
        </>
      )}
      <div className="mt-6 space-y-3">
        <p className="text-xs text-gray-500">
          수요일과 일요일 저녁 알림은{" "}
          <Link href="/supplements" className="font-medium text-brand-700 underline">
            영양제·알림
          </Link>
          에서 켤 수 있습니다.
        </p>
        <DiningCodeCard compact />
      </div>
    </div>
  );
}
