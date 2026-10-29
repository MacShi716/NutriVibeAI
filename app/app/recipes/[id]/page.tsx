"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { storage } from "@/lib/storage";
import { calcNutritionDetail } from "@/lib/nutrition";
import { calcOwnedUsage } from "@/lib/shopping";
import { estimateDailyCalories } from "@/lib/profile";
import { useCountUp } from "@/components/useCountUp";
import { trackEvent } from "@/lib/gamification";
import type { Recipe } from "@/lib/types";

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  // SSR/CSR 일치를 위해 localStorage는 mount 이후에만 읽는다
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ownedRaw, setOwnedRaw] = useState("");
  const [isFav, setIsFav] = useState(false);
  const [dailyCal, setDailyCal] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const result = storage.getLastResult();
    const found = result?.recipes.find((r) => r.id === id) ?? null;
    setRecipe(found);
    setOwnedRaw(result?.conditions.ingredients ?? "");
    setIsFav(found ? storage.isFavorite(found.id) : false);
    const profile = storage.getProfile();
    const est =
      profile &&
      estimateDailyCalories({
        gender: profile.gender,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activityLevel: profile.activityLevel,
      });
    if (est) setDailyCal(est.dailyCalories);
    setLoaded(true);
  }, [id]);

  const detail = useMemo(
    () => (recipe ? calcNutritionDetail(recipe.ingredients) : null),
    [recipe]
  );

  const usage = useMemo(
    () =>
      recipe ? calcOwnedUsage(recipe.ingredients, ownedRaw) : null,
    [recipe, ownedRaw]
  );

  const totalCal = useCountUp(recipe ? detail?.totals.calories ?? 0 : 0, 800);
  const [popFav, setPopFav] = useState(false);

  if (!loaded) return null;

  if (!recipe || !detail) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <p className="text-gray-600">레시피를 찾을 수 없습니다.</p>
        <Link
          href="/recipes"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
        >
          추천 레시피로 돌아가기
        </Link>
      </div>
    );
  }

  function toggleFav() {
    if (!recipe) return;
    const adding = !storage.getFavorites().some((r) => r.id === recipe.id);
    storage.toggleFavorite(recipe);
    setIsFav(storage.isFavorite(recipe.id));
    setPopFav(true);
    setTimeout(() => setPopFav(false), 350);
    if (adding) trackEvent({ type: "favorite" });
  }

  const perServing = {
    calories: Math.round(detail.totals.calories / recipe.servings),
    protein: Math.round((detail.totals.protein / recipe.servings) * 10) / 10,
    carbs: Math.round((detail.totals.carbs / recipe.servings) * 10) / 10,
    fat: Math.round((detail.totals.fat / recipe.servings) * 10) / 10,
  };
  const dailyPct =
    dailyCal && dailyCal > 0
      ? Math.round((detail.totals.calories / dailyCal) * 100)
      : null;
  const known = detail.rows.filter((r) => r.calories !== null).length;
  const unknown = detail.rows.length - known;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Link href="/recipes" className="text-sm text-brand-600 hover:underline">
          ← 추천 레시피로 돌아가기
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
            <p className="mt-1 text-sm text-gray-600">{recipe.description}</p>
          </div>
          <button
            onClick={toggleFav}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              isFav
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            } ${popFav ? "anim-pop" : ""}`}
          >
            {isFav ? "★ 즐겨찾기됨" : "☆ 즐겨찾기"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-brand-50 px-2 py-1 text-brand-700">
            조리 시간 {recipe.cookMinutes}분
          </span>
          <span className="rounded bg-brand-50 px-2 py-1 text-brand-700">
            {recipe.servings}인분
          </span>
          <span className="rounded bg-brand-50 px-2 py-1 text-brand-700">
            총 열량 {totalCal} kcal
          </span>
          <span className="rounded bg-brand-50 px-2 py-1 text-brand-700">
            1인분 약 {perServing.calories} kcal
          </span>
          {dailyPct !== null && (
            <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">
              일일 권장 열량의 약 {dailyPct}%
            </span>
          )}
          {recipe.nutrition.goalPct !== null && recipe.nutrition.goalPct !== undefined && (
            <span
              className={`rounded px-2 py-1 font-semibold ${
                recipe.nutrition.goalPct <= 85
                  ? "bg-green-50 text-green-700"
                  : recipe.nutrition.goalPct <= 115
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-600"
              }`}
            >
              목표 열량 대비 {recipe.nutrition.goalPct}%
            </span>
          )}
          {usage && (
            <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">
              보유 식재료 활용 {usage.pct}% ({usage.used}/{usage.total})
            </span>
          )}
        </div>

        <h2 className="mt-6 text-base font-bold text-gray-900">재료</h2>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {recipe.ingredients.map((ing, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
            >
              <span>{ing.name}</span>
              <span className="text-gray-500">{ing.amount}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 text-base font-bold text-gray-900">조리 방법</h2>
        <ol className="mt-2 space-y-2">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        <h2 className="mt-6 text-base font-bold text-gray-900">
          열량 상세 계산 (재료별)
        </h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-semibold">재료</th>
                <th className="px-3 py-2 font-semibold">사용량</th>
                <th className="px-3 py-2 text-right font-semibold">100g당 열량</th>
                <th className="px-3 py-2 text-right font-semibold">열량(kcal)</th>
                <th className="px-3 py-2 text-right font-semibold">단백질(g)</th>
              </tr>
            </thead>
            <tbody>
              {detail.rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-gray-500">{r.amount}</td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {r.caloriesPer100 !== null ? r.caloriesPer100 : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">
                    {r.calories !== null ? r.calories : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {r.protein !== null ? r.protein : "—"}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-gray-900">
                <td className="px-3 py-2" colSpan={3}>
                  합계 ({recipe.servings}인분)
                </td>
                <td className="px-3 py-2 text-right">{detail.totals.calories} kcal</td>
                <td className="px-3 py-2 text-right">{detail.totals.protein} g</td>
              </tr>
            </tbody>
          </table>
        </div>
        {unknown > 0 && (
          <p className="mt-1 text-xs text-gray-400">
            영양 데이터에 없는 재료 {unknown}종은 계산에서 제외되었습니다.
          </p>
        )}

        <h2 className="mt-6 text-base font-bold text-gray-900">
          기본 영양 참고 정보
        </h2>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          {[
            ["열량(총)", `${detail.totals.calories} kcal`],
            ["단백질", `${detail.totals.protein} g`],
            ["탄수화물", `${detail.totals.carbs} g`],
            ["지방", `${detail.totals.fat} g`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg bg-brand-50 px-2 py-3 text-sm"
            >
              <div className="text-xs text-gray-500">{label}</div>
              <div className="mt-0.5 font-bold text-brand-700">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          {[
            ["1인분 열량", `${perServing.calories} kcal`],
            ["1인분 단백질", `${perServing.protein} g`],
            ["1인분 탄수화물", `${perServing.carbs} g`],
            ["1인분 지방", `${perServing.fat} g`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg bg-gray-50 px-2 py-3 text-sm"
            >
              <div className="text-xs text-gray-500">{label}</div>
              <div className="mt-0.5 font-bold text-gray-700">{value}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {recipe.nutrition.note ??
            "내부 영양 참고 데이터(nutrition-data.json) 기준 추정치입니다."}
          {dailyPct !== null && dailyCal
            ? ` 일일 권장 열량(${dailyCal} kcal)은 내 프로필 정보로 추정한 참고치입니다.`
            : " 내 프로필에서 신체 정보를 저장하면 일일 권장 열량 대비 비율을 볼 수 있습니다."}
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/shopping-list"
            className="flex-1 rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-700"
          >
            이 레시피로 쇼핑리스트 생성
          </Link>
        </div>
      </div>
    </div>
  );
}
