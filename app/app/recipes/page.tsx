"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUi } from "@/components/UiProvider";
import { parseLocale } from "@/i18n/locale";
import CalorieFormula from "@/components/CalorieFormula";
import DishVisual from "@/components/DishVisual";
import PortionPrompt from "@/components/PortionPrompt";
import { caloriePartsOf } from "@/lib/calories";
import { useCountUp } from "@/components/useCountUp";
import { displayRestrictions, format, localizeMessage } from "@/i18n/text";
import { ko } from "@/i18n/messages/ko";
import { requestRecipes } from "@/lib/client-api";
import { isLoggedToday, logRecipeToday, notifyDaily, removeDailyLog } from "@/lib/daily";
import { calcOwnedUsage } from "@/lib/shopping";
import { storage } from "@/lib/storage";
import type { GenerateResult, Recipe } from "@/lib/types";

function GoalBadge({ goalPct }: { goalPct?: number | null }) {
  const { t } = useUi();
  if (!goalPct) return null;
  const tone =
    goalPct <= 85
      ? "bg-green-50 text-green-700"
      : goalPct <= 115
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-600";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {format(t.recipes.goalPct, { n: goalPct })}
    </span>
  );
}

function CalorieBar({
  title,
  calories,
  max,
  delay,
}: {
  title: string;
  calories: number;
  max: number;
  delay: number;
}) {
  const v = useCountUp(calories, 800);
  const pct = max > 0 ? Math.max(8, Math.round((calories / max) * 100)) : 8;
  return (
    <div className="anim-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-700">{title}</span>
        <span className="text-gray-500">{v} kcal</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="bar-grow h-full rounded-full bg-brand-500"
          style={{ "--bar-w": `${pct}%`, animationDelay: `${delay + 200}ms` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const { t, locale } = useUi();
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [logged, setLogged] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Recipe | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = storage.getLastResult();
    const savedLocale = parseLocale(saved?.locale ?? saved?.conditions?.locale);
    const next = saved && savedLocale === locale ? saved : null;
    setResult(next);
    if (next) {
      const flags: Record<string, boolean> = {};
      next.recipes.forEach((recipe) => {
        flags[recipe.id] = isLoggedToday(recipe.id);
      });
      setLogged(flags);
    } else {
      setLogged({});
    }
  }, [locale]);

  function toggleLog(recipe: Recipe) {
    if (isLoggedToday(recipe.id)) {
      removeDailyLog(recipe.id);
      notifyDaily();
      setLogged((prev) => ({ ...prev, [recipe.id]: false }));
      return;
    }
    setPending(recipe);
  }

  function confirmLog(servingsById: Record<string, number>) {
    if (!pending) return;
    const servings = servingsById[pending.id];
    const on = logRecipeToday(pending, servings);
    notifyDaily();
    setLogged((prev) => ({ ...prev, [pending.id]: on }));
    setPending(null);
  }

  async function regenerate() {
    if (!result || regenerating) return;
    setRegenerating(true);
    setError("");
    try {
      const outcome = await requestRecipes(result.conditions);
      if (!outcome.ok) throw new Error(outcome.error);
      const next = outcome.result;
      storage.saveLastResult(next);
      setResult(next);
    } catch {
      setError(ko.errors.regenerateFailed);
    } finally {
      setRegenerating(false);
    }
  }

  const summary = useMemo(() => {
    if (!result || result.recipes.length === 0) return null;
    const total = result.recipes.reduce((a, r) => a + r.nutrition.calories, 0);
    const avg = Math.round(total / result.recipes.length);
    const max = Math.max(...result.recipes.map((r) => r.nutrition.calories));
    return { total, avg, max };
  }, [result]);

  if (!result) {
    return (
      <div className="anim-fade-up nv-card nv-empty mx-auto max-w-2xl p-10">
        <p className="text-gray-600">{t.recipes.empty}</p>
        <Link
          href="/"
          className="nv-btn mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
        >
          {t.common.enterConditions}
        </Link>
      </div>
    );
  }

  const owned = result.conditions.ingredients || t.common.none;
  const searchList = result.conditions.ingredients || t.recipes.searchIngredient;

  return (
    <div className="anim-fade-up mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t.recipes.title}</h1>
        <Link href="/" className="nv-press text-sm text-brand-600 hover:underline">
          {t.recipes.edit}
        </Link>
      </div>

      {result.usedMock && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid="result-demo-notice">
          {t.recipes.demo}
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="mb-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {result.warnings.map((w, i) => (
            <p key={i}>{localizeMessage(w, t)}</p>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-gray-100 px-3 py-1">{format(t.recipes.owned, { list: owned })}</span>
        <span className="rounded-full bg-gray-100 px-3 py-1">
          {format(t.recipes.meta, { servings: result.conditions.servings, minutes: result.conditions.cookMinutes })}
        </span>
        {result.conditions.restrictions && (
          <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">
            {format(t.recipes.restricted, { list: displayRestrictions(result.conditions.restrictions, t) })}
          </span>
        )}
        {result.conditions.goalCalories && (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700">
            {format(t.recipes.goal, { n: result.conditions.goalCalories })}
          </span>
        )}
      </div>

      {summary && (
        <div className="nv-card mb-5 p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-sm font-bold text-gray-900">{t.recipes.summary}</h2>
            <span className="text-right text-xs text-gray-500">
              {format(t.recipes.summaryMeta, { count: result.recipes.length, total: summary.total, avg: summary.avg })}
            </span>
          </div>
          <CalorieFormula
            className="mb-3 text-xs text-gray-500"
            parts={caloriePartsOf(result.recipes.map((recipe) => ({ title: recipe.title, calories: recipe.nutrition.calories })))}
          />
          <div className="space-y-3">
            {result.recipes.map((r, i) => (
              <CalorieBar key={r.id} title={r.title} calories={r.nutrition.calories} max={summary.max} delay={i * 150} />
            ))}
          </div>
        </div>
      )}

      {result.recipes.length === 0 && (
        <div className="anim-fade-up nv-card nv-empty mb-5 p-8">
          <div className="nv-empty-mark" aria-hidden="true">😥</div>
          <h2 className="mt-2 text-lg font-bold text-gray-900">{t.recipes.noMatchTitle}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {format(t.recipes.noMatchBody, { list: result.conditions.ingredients || t.recipes.missingIngredients })}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href={`https://search.naver.com/search.naver?query=${encodeURIComponent(`${searchList} ${t.recipes.searchRecipe}`)}`}
              target="_blank"
              rel="noreferrer"
              className="nv-btn rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              {format(t.recipes.searchNaver, { list: searchList })}
            </a>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${searchList} ${t.recipes.searchRecipe}`)}`}
              target="_blank"
              rel="noreferrer"
              className="nv-btn-secondary rounded-lg border border-brand-600 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              {t.recipes.searchGoogle}
            </a>
          </div>
          <Link href="/" className="nv-press mt-4 inline-block text-sm text-brand-600 hover:underline">
            {t.recipes.editAgain}
          </Link>
        </div>
      )}

      <div className="nv-stagger grid gap-4 sm:grid-cols-2">
        {result.recipes.map((r) => {
          const usage = calcOwnedUsage(r.ingredients, result.conditions.ingredients);
          return (
            <article
              key={r.id}
              className="nv-card nv-card-hover overflow-hidden"
            >
              <Link href={`/recipes/view?id=${encodeURIComponent(r.id)}`} className="group block p-5">
                <DishVisual recipe={r} variant="card" className="mb-3" />
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-brand-700">{r.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{r.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">{format(t.recipes.minutes, { n: r.cookMinutes })}</span>
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">{format(t.recipes.servings, { n: r.servings })}</span>
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">{r.nutrition.calories} kcal</span>
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">
                    {format(t.recipes.protein, { n: r.nutrition.protein })}
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                    {format(t.recipes.macros, { carbs: r.nutrition.carbs, fat: r.nutrition.fat })}
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                    {format(t.recipes.ownedPct, { n: usage.pct })}
                  </span>
                  <GoalBadge goalPct={r.nutrition.goalPct} />
                </div>
              </Link>
              <button
                type="button"
                onClick={() => toggleLog(r)}
                className="nv-btn-secondary mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {logged[r.id] ? t.recipes.logOn : t.recipes.logOff}
              </button>
              <p className="mt-2 text-[11px] text-gray-400">{t.common.nutritionReference}</p>
            </article>
          );
        })}
      </div>

      {error && <p className="nv-error mt-4">{localizeMessage(error, t)}</p>}

      {result.recipes.length > 0 && (
        <div className="mt-6 flex gap-3">
          <Link
            href="/shopping-list"
            className="nv-btn flex-1 rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-700"
          >
            {t.recipes.shopping}
          </Link>
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="nv-btn-secondary flex-1 rounded-lg border border-brand-600 px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            {regenerating ? t.common.generating : t.recipes.regenerate}
          </button>
        </div>
      )}
      {pending && (
        <PortionPrompt
          items={[{ id: pending.id, title: pending.title }]}
          onConfirm={confirmLog}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
