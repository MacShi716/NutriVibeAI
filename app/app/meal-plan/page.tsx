"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUi } from "@/components/UiProvider";
import { displayRestrictions, format, localizeMessage, slotLabel, weekdayLabel } from "@/i18n/text";
import { ko } from "@/i18n/messages/ko";
import { requestMealSwap, requestWeeklyPlan } from "@/lib/client-api";
import DiningCodeCard from "@/components/DiningCodeCard";
import PortionPrompt from "@/components/PortionPrompt";
import { isLoggedToday, logRecipesToday, notifyDaily } from "@/lib/daily";
import { todayKey, weekdayIndex } from "@/lib/dates";
import { listExpiringNames } from "@/lib/pantry";
import { estimateDailyCalories, targetCalories } from "@/lib/profile";
import { mergeShoppingItems, weeklyShoppingList } from "@/lib/shopping";
import { storage } from "@/lib/storage";
import type { MealSlot, Recipe, UserConditions, WeeklyPlan } from "@/lib/types";

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

type Note =
  | { kind: "merged"; count: number }
  | { kind: "noToday" }
  | { kind: "logged"; count: number }
  | { kind: "already" }
  | { kind: "noneLogged" };

function resolveConditions(): UserConditions {
  const saved = storage.getConditions();
  const profile = storage.getProfile();
  const estimate = profile ? estimateDailyCalories(profile) : null;
  return {
    ...EMPTY,
    ...saved,
    goalCalories: saved?.goalCalories ?? (estimate ? targetCalories(estimate, "maintain") : null),
    goalProtein: saved?.goalProtein ?? profile?.proteinGoalG ?? null,
    prioritizeExpiring: saved?.prioritizeExpiring ?? false,
  };
}

export default function MealPlanPage() {
  const { t } = useUi();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [justMade, setJustMade] = useState(false);
  const [pendingMeals, setPendingMeals] = useState<Recipe[] | null>(null);

  useEffect(() => {
    setPlan(storage.getWeeklyPlan());
    setReady(true);
  }, []);

  function payload(conditions: UserConditions) {
    return {
      ...conditions,
      expiringIngredients: conditions.prioritizeExpiring ? listExpiringNames(storage.getPantry()) : [],
    };
  }

  function noteText(value: Note): string {
    switch (value.kind) {
      case "merged":
        return format(t.mealPlan.merged, { count: value.count });
      case "noToday":
        return t.mealPlan.noToday;
      case "logged":
        return format(t.mealPlan.logged, { count: value.count });
      case "already":
        return t.mealPlan.already;
      case "noneLogged":
        return t.mealPlan.noneLogged;
      default: {
        const never: never = value;
        return never;
      }
    }
  }

  async function generate(keepPinned: boolean) {
    const conditions = resolveConditions();
    if (!conditions.ingredients.trim()) {
      setError(ko.errors.homeNeedIngredients);
      return;
    }
    setBusy(keepPinned ? "regen" : "generate");
    setError("");
    setNote(null);
    const pinned =
      keepPinned && plan
        ? plan.days.flatMap((day) =>
            day.meals.flatMap((meal) =>
              meal.pinned && meal.recipe ? [{ date: day.date, slot: meal.slot, recipe: meal.recipe }] : []
            )
          )
        : [];
    try {
      const outcome = await requestWeeklyPlan({
        startDate: plan?.startDate && keepPinned ? plan.startDate : todayKey(),
        conditions: payload(conditions),
        pinned,
      });
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      storage.saveWeeklyPlan(outcome.plan);
      setPlan(outcome.plan);
      setJustMade(true);
    } catch {
      setError(ko.errors.server);
    } finally {
      setBusy("");
    }
  }

  async function swap(date: string, slot: MealSlot) {
    if (!plan) return;
    const conditions = plan.conditions;
    const avoidTitles = plan.days.flatMap((day) => day.meals.map((meal) => meal.recipe?.title ?? "")).filter(Boolean);
    setBusy(`${date}:${slot}`);
    setError("");
    try {
      const outcome = await requestMealSwap({
        conditions: payload(conditions),
        slot,
        avoidTitles,
      });
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      const next: WeeklyPlan = {
        ...plan,
        days: plan.days.map((day) =>
          day.date !== date
            ? day
            : {
                ...day,
                meals: day.meals.map((meal) => (meal.slot === slot ? { ...meal, recipe: outcome.recipe } : meal)),
              }
        ),
      };
      storage.saveWeeklyPlan(next);
      setPlan(next);
    } catch {
      setError(ko.errors.server);
    } finally {
      setBusy("");
    }
  }

  function togglePin(date: string, slot: MealSlot) {
    if (!plan) return;
    const next: WeeklyPlan = {
      ...plan,
      days: plan.days.map((day) =>
        day.date !== date
          ? day
          : {
              ...day,
              meals: day.meals.map((meal) => (meal.slot === slot ? { ...meal, pinned: !meal.pinned } : meal)),
            }
      ),
    };
    storage.saveWeeklyPlan(next);
    setPlan(next);
  }

  function applyShopping() {
    if (!plan) return;
    const weekly = weeklyShoppingList(plan);
    const merged = mergeShoppingItems([storage.getShopping().items, weekly]);
    storage.saveShopping(merged);
    setNote({ kind: "merged", count: weekly.length });
  }

  function logToday() {
    if (!plan) return;
    const today = plan.days.find((day) => day.date === todayKey());
    const recipes =
      today?.meals.map((meal) => meal.recipe).filter((recipe): recipe is Recipe => recipe !== null) ?? [];
    if (recipes.length === 0) {
      setNote({ kind: "noToday" });
      return;
    }
    const pending = recipes.filter((recipe) => !isLoggedToday(recipe.id));
    if (pending.length === 0) {
      setNote({ kind: "already" });
      return;
    }
    setPendingMeals(pending);
  }

  function confirmToday(servingsById: Record<string, number>) {
    const added = logRecipesToday(pendingMeals ?? [], servingsById);
    notifyDaily();
    setPendingMeals(null);
    setNote(added > 0 ? { kind: "logged", count: added } : { kind: "noneLogged" });
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl" data-testid="weekly-plan">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t.mealPlan.title}</h1>
          <p className="mt-1 text-sm text-gray-600">{t.mealPlan.intro}</p>
        </div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          {t.mealPlan.edit}
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() => void generate(false)}
          className={`rounded-lg bg-brand-600 font-bold text-white hover:bg-brand-700 disabled:opacity-50 ${
            plan ? "px-4 py-2 text-sm" : "px-5 py-3 text-base"
          }`}
        >
          {busy === "generate" ? t.mealPlan.generating : t.mealPlan.generate}
        </button>
        <button
          type="button"
          disabled={busy !== "" || !plan}
          onClick={() => void generate(true)}
          className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          {busy === "regen" ? t.mealPlan.regenerating : t.mealPlan.regen}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {localizeMessage(error, t)}
        </p>
      )}

      {!plan && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600 sm:p-8">
          <p>{t.mealPlan.empty}</p>
          <button
            type="button"
            disabled={busy !== ""}
            onClick={() => void generate(false)}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50 sm:w-auto"
          >
            {busy === "generate" ? t.mealPlan.generating : t.mealPlan.generate}
          </button>
        </div>
      )}

      {plan && (
        <>
          {plan.usedMock && (
            <div
              className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              data-testid="plan-demo-notice"
            >
              {t.mealPlan.demo}
            </div>
          )}
          {plan.warnings.length > 0 && (
            <div className="mb-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {plan.warnings.map((warning) => (
                <p key={warning}>{localizeMessage(warning, t)}</p>
              ))}
            </div>
          )}
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="rounded-full bg-gray-100 px-3 py-1">
              {format(t.mealPlan.owned, { list: plan.conditions.ingredients || t.common.none })}
            </span>
            {plan.conditions.restrictions && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">
                {format(t.mealPlan.restricted, { list: displayRestrictions(plan.conditions.restrictions, t) })}
              </span>
            )}
            {plan.conditions.goalCalories ? (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700">
                {format(t.mealPlan.calories, { n: plan.conditions.goalCalories })}
              </span>
            ) : null}
            {plan.conditions.goalProtein ? (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700">
                {format(t.mealPlan.protein, { n: plan.conditions.goalProtein })}
              </span>
            ) : null}
          </div>

          <div className="mb-4 rounded-2xl border border-brand-100 bg-brand-50 p-4" data-testid="plan-next-steps">
            <p className="text-sm font-semibold text-gray-900">
              {justMade ? t.mealPlan.nextMade : t.mealPlan.nextExisting}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={logToday}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700"
              >
                {t.mealPlan.logToday}
              </button>
              <button
                type="button"
                onClick={applyShopping}
                className="flex-1 rounded-lg border border-brand-600 bg-white px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50"
              >
                {t.mealPlan.mergeShopping}
              </button>
            </div>
            {note && (
              <p className="mt-3 text-sm text-brand-700">
                {noteText(note)}{" "}
                {note.kind === "merged" && (
                  <Link href="/shopping-list" className="underline">
                    {t.mealPlan.viewShopping}
                  </Link>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {plan.days.map((day) => (
              <section key={day.date} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900">
                  {day.date.slice(5)} ({weekdayLabel(t, weekdayIndex(day.date))})
                  {day.date === todayKey() ? <span className="ml-2 text-xs text-brand-600">{t.mealPlan.today}</span> : null}
                </h2>
                <ul className="mt-3 space-y-3">
                  {day.meals.map((meal) => {
                    const key = `${day.date}:${meal.slot}`;
                    return (
                      <li key={meal.slot} className="rounded-lg bg-gray-50 px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-semibold text-gray-500">{slotLabel(t, meal.slot)}</p>
                            <p className="text-sm font-bold text-gray-900">{meal.recipe?.title ?? t.mealPlan.noRecipe}</p>
                            {meal.recipe && (
                              <p className="mt-0.5 text-[11px] text-gray-500">
                                {format(t.mealPlan.macros, {
                                  cal: meal.recipe.nutrition.calories,
                                  protein: meal.recipe.nutrition.protein,
                                  carbs: meal.recipe.nutrition.carbs,
                                  fat: meal.recipe.nutrition.fat,
                                })}
                              </p>
                            )}
                          </div>
                          {meal.pinned && <span className="text-[11px] font-semibold text-brand-700">{t.mealPlan.pinned}</span>}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            disabled={busy !== ""}
                            onClick={() => void swap(day.date, meal.slot)}
                          >
                            {busy === key ? t.mealPlan.swapping : t.mealPlan.swap}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100"
                            onClick={() => togglePin(day.date, meal.slot)}
                          >
                            {meal.pinned ? t.mealPlan.unpin : t.mealPlan.pin}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={applyShopping}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700"
            >
              {t.mealPlan.applyWeek}
            </button>
            <button
              type="button"
              onClick={logToday}
              className="flex-1 rounded-lg border border-brand-600 px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              {t.mealPlan.logRecord}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400">{t.common.nutritionReference}</p>
        </>
      )}
      <div className="mt-6">
        <DiningCodeCard />
      </div>
      {pendingMeals && (
        <PortionPrompt
          items={pendingMeals.map((recipe) => ({ id: recipe.id, title: recipe.title }))}
          onConfirm={confirmToday}
          onCancel={() => setPendingMeals(null)}
        />
      )}
    </div>
  );
}
