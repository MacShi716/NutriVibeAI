"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { requestRecipes } from "@/lib/client-api";
import { storage } from "@/lib/storage";
import type { HistoryEntry } from "@/lib/storage";
import type { Recipe, UserConditions } from "@/lib/types";

export default function FavoritesPage() {
  const router = useRouter();
  const [favs, setFavs] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  useEffect(() => {
    setFavs(storage.getFavorites());
    setHistory(storage.getHistory());
  }, []);

  function removeFav(id: string) {
    const recipe = favs.find((r) => r.id === id);
    if (!recipe) return;
    storage.toggleFavorite(recipe);
    setFavs(storage.getFavorites());
  }

  async function regenerate(idx: number, conditions?: UserConditions | null) {
    if (!conditions || regeneratingId !== null) return;
    setRegeneratingId(idx);
    try {
      const outcome = await requestRecipes(conditions);
      if (!outcome.ok) throw new Error(outcome.error);
      storage.saveLastResult(outcome.result);
      router.push("/recipes");
    } catch {
      alert("다시 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">즐겨찾기 · 생성 기록</h1>

      <h2 className="mb-3 mt-6 text-base font-bold text-gray-900">즐겨찾기 레시피</h2>
      {favs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          저장된 즐겨찾기가 없습니다. 레시피 상세 화면에서 ★ 버튼을 눌러보세요.
        </div>
      ) : (
        <ul className="space-y-2">
          {favs.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <Link
                  href={`/recipes/view?id=${encodeURIComponent(r.id)}`}
                  className="font-semibold text-gray-900 hover:text-brand-700"
                >
                  {r.title}
                </Link>
                <p className="text-xs text-gray-500">
                  {r.cookMinutes}분 · {r.servings}인분 ·{" "}
                  {r.ingredients.length}가지 재료
                </p>
              </div>
              <button
                onClick={() => removeFav(r.id)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-8 text-base font-bold text-gray-900">최근 생성 기록</h2>
      {history.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          아직 생성 기록이 없습니다.
        </div>
      ) : (
        <ul className="space-y-2">
          {history.map((h, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{h.title}</p>
                <p className="text-xs text-gray-500">
                  {h.recipeCount}개 레시피 생성 ·{" "}
                  {new Date(h.generatedAt).toLocaleString("ko-KR")}
                  {h.usedMock ? " · 데모 모드" : ""}
                </p>
                {h.conditions && (
                  <p className="mt-1 text-xs text-gray-400">
                    보유 {h.conditions.ingredients || "—"} · {h.conditions.servings}인분 ·{" "}
                    {h.conditions.cookMinutes}분
                    {h.conditions.goalCalories
                      ? ` · 목표 ${h.conditions.goalCalories} kcal`
                      : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {h.conditions && (
                  <button
                    onClick={() => regenerate(i, h.conditions)}
                    disabled={regeneratingId !== null}
                    className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                  >
                    {regeneratingId === i ? "생성 중..." : "다시 생성"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
