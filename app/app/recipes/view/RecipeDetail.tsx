"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUi } from "@/components/UiProvider";
import { format, localizeMessage } from "@/i18n/text";
import { storage } from "@/lib/storage";
import { calcNutritionDetail } from "@/lib/nutrition";
import { calcOwnedUsage } from "@/lib/shopping";
import { estimateDailyCalories } from "@/lib/profile";
import { useCountUp } from "@/components/useCountUp";
import { trackEvent } from "@/lib/gamification";
import { caloriePartsOf } from "@/lib/calories";
import { isLoggedToday, logRecipeToday, notifyDaily, removeDailyLog } from "@/lib/daily";
import CalorieFormula from "@/components/CalorieFormula";
import DishVisual from "@/components/DishVisual";
import PortionPrompt from "@/components/PortionPrompt";
import type { Recipe } from "@/lib/types";

export default function RecipeDetailPage() {
  const { t } = useUi();
  const id = useSearchParams().get("id") ?? "";
  // SSR/CSR 일치를 위해 localStorage는 mount 이후에만 읽는다
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ownedRaw, setOwnedRaw] = useState("");
  const [isFav, setIsFav] = useState(false);
  const [logged, setLogged] = useState(false);
  const [dailyCal, setDailyCal] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [askPortion, setAskPortion] = useState(false);

  useEffect(() => {
    const result = storage.getLastResult();
    const found = result?.recipes.find((r) => r.id === id) ?? null;
    setRecipe(found);
    setOwnedRaw(result?.conditions.ingredients ?? "");
    setIsFav(found ? storage.isFavorite(found.id) : false);
    setLogged(found ? isLoggedToday(found.id) : false);
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
      <div className="nv-card nv-empty mx-auto max-w-2xl p-10">
        <p className="text-gray-600">{t.detail.missing}</p>
        <Link
          href="/recipes"
          className="nv-btn mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
        >
          {t.detail.back}
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
    if (adding) trackEvent({ type: "favorite", recipeId: recipe.id });
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
        <Link href="/recipes" className="nv-press text-sm text-brand-600 hover:underline">
          {t.detail.backShort}
        </Link>
      </div>

      <div className="nv-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
            <p className="mt-1 text-sm text-gray-600">{recipe.description}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button
              onClick={toggleFav}
              className={`nv-press rounded-lg border px-3 py-2 text-sm font-medium transition ${
                isFav
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              } ${popFav ? "anim-pop" : ""}`}
            >
              {isFav ? t.detail.saved : t.detail.save}
            </button>
            <button
              type="button"
              onClick={() => {
                if (logged) {
                  removeDailyLog(recipe.id);
                  setLogged(false);
                  notifyDaily();
                  return;
                }
                setAskPortion(true);
              }}
              className="nv-btn-secondary rounded-lg border border-brand-600 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              {logged ? t.detail.logOn : t.detail.logOff}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-brand-50 px-2 py-1 text-brand-700">
            {format(t.detail.cook, { n: recipe.cookMinutes })}
          </span>
          <span className="rounded bg-brand-50 px-2 py-1 text-brand-700">
            {format(t.detail.servings, { n: recipe.servings })}
          </span>
          <span className="rounded bg-brand-50 px-2 py-1 text-brand-700">
            {format(t.detail.totalCal, { n: totalCal })}
          </span>
          <span className="rounded bg-brand-50 px-2 py-1 text-brand-700">
            {format(t.detail.perCal, { n: perServing.calories })}
          </span>
          {dailyPct !== null && (
            <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">
              {format(t.detail.dailyPct, { n: dailyPct })}
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
              {format(t.detail.goalPct, { n: recipe.nutrition.goalPct })}
            </span>
          )}
          {usage && (
            <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">
              {format(t.detail.owned, { pct: usage.pct, used: usage.used, total: usage.total })}
            </span>
          )}
        </div>

        <div className="mt-5">
          <DishVisual recipe={recipe} variant="hero" />
        </div>

        <h2 className="mt-6 text-base font-bold text-gray-900">{t.detail.ingredients}</h2>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {recipe.ingredients.map((ing, i) => (
            <li
              key={i}
              className="nv-inset flex items-center justify-between px-3 py-2 text-sm"
            >
              <span>{ing.name}</span>
              <span className="text-gray-500">{ing.amount}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 text-base font-bold text-gray-900">{t.detail.steps}</h2>
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
          {t.detail.tableTitle}
        </h2>
        <div className="nv-inset mt-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-semibold">{t.detail.colIngredient}</th>
                <th className="px-3 py-2 font-semibold">{t.detail.colAmount}</th>
                <th className="px-3 py-2 text-right font-semibold">{t.detail.colPer100}</th>
                <th className="px-3 py-2 text-right font-semibold">{t.detail.colKcal}</th>
                <th className="px-3 py-2 text-right font-semibold">{t.detail.colProtein}</th>
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
                  {format(t.detail.totalRow, { n: recipe.servings })}
                </td>
                <td className="px-3 py-2 text-right">{detail.totals.calories} kcal</td>
                <td className="px-3 py-2 text-right">{detail.totals.protein} g</td>
              </tr>
            </tbody>
          </table>
        </div>
        <CalorieFormula
          className="mt-2 text-xs text-gray-500"
          parts={caloriePartsOf(detail.rows.map((row) => ({ name: row.name, calories: row.calories })))}
        />
        {unknown > 0 && (
          <p className="mt-1 text-xs text-gray-400">
            {format(t.detail.unknown, { n: unknown })}
          </p>
        )}

        <h2 className="mt-6 text-base font-bold text-gray-900">
          {t.detail.macroTitle}
        </h2>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          {[
            [t.detail.calTotal, `${detail.totals.calories} kcal`],
            [t.detail.protein, `${detail.totals.protein} g`],
            [t.detail.carbs, `${detail.totals.carbs} g`],
            [t.detail.fat, `${detail.totals.fat} g`],
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
            [t.detail.perCalLabel, `${perServing.calories} kcal`],
            [t.detail.perProtein, `${perServing.protein} g`],
            [t.detail.perCarbs, `${perServing.carbs} g`],
            [t.detail.perFat, `${perServing.fat} g`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="nv-tile px-2 py-3 text-sm"
            >
              <div className="text-xs text-gray-500">{label}</div>
              <div className="mt-0.5 font-bold text-gray-700">{value}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {recipe.nutrition.note ? localizeMessage(recipe.nutrition.note, t) : t.detail.fallback}
          {dailyPct !== null && dailyCal
            ? format(t.detail.dailyWith, { n: dailyCal })
            : t.detail.dailyWithout}
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/shopping-list"
            className="nv-btn flex-1 rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-700"
          >
            {t.detail.shopping}
          </Link>
        </div>
      </div>
      {askPortion && (
        <PortionPrompt
          items={[{ id: recipe.id, title: recipe.title }]}
          onConfirm={(servingsById) => {
            const on = logRecipeToday(recipe, servingsById[recipe.id]);
            setLogged(on);
            notifyDaily();
            setAskPortion(false);
          }}
          onCancel={() => setAskPortion(false)}
        />
      )}
    </div>
  );
}
