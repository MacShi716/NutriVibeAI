"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logRecipesToday, notifyDaily } from "@/lib/daily";
import { todayKey, weekdayKo } from "@/lib/dates";
import { listExpiringNames } from "@/lib/pantry";
import { estimateDailyCalories, targetCalories } from "@/lib/profile";
import { mealSlotLabel } from "@/lib/slots";
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
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

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

  async function generate(keepPinned: boolean) {
    const conditions = resolveConditions();
    if (!conditions.ingredients.trim()) {
      setError("홈에서 보유 식재료를 입력한 뒤 주간 식단을 만들어 주세요.");
      return;
    }
    setBusy(keepPinned ? "regen" : "generate");
    setError("");
    setNote("");
    const pinned =
      keepPinned && plan
        ? plan.days.flatMap((day) =>
            day.meals
              .filter((meal) => meal.pinned && meal.recipe)
              .map((meal) => ({ date: day.date, slot: meal.slot, recipe: meal.recipe }))
          )
        : [];
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          startDate: plan?.startDate && keepPinned ? plan.startDate : todayKey(),
          conditions: payload(conditions),
          pinned,
        }),
      });
      const data = (await res.json()) as { plan?: WeeklyPlan; error?: string };
      if (!res.ok || !data.plan) {
        setError(data.error ?? "주간 식단을 만들지 못했습니다.");
        return;
      }
      storage.saveWeeklyPlan(data.plan);
      setPlan(data.plan);
    } catch {
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "swap",
          conditions: payload(conditions),
          slot,
          avoidTitles,
        }),
      });
      const data = (await res.json()) as { recipe?: Recipe; error?: string };
      if (!res.ok || !data.recipe) {
        setError(data.error ?? "다른 레시피를 찾지 못했습니다.");
        return;
      }
      const next: WeeklyPlan = {
        ...plan,
        days: plan.days.map((day) =>
          day.date !== date
            ? day
            : {
                ...day,
                meals: day.meals.map((meal) =>
                  meal.slot === slot ? { ...meal, recipe: data.recipe ?? meal.recipe } : meal
                ),
              }
        ),
      };
      storage.saveWeeklyPlan(next);
      setPlan(next);
    } catch {
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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
    setNote(`7일 장보기 ${weekly.length}개를 쇼핑리스트에 합쳤습니다.`);
  }

  function logToday() {
    if (!plan) return;
    const today = plan.days.find((day) => day.date === todayKey());
    const recipes = (today?.meals.map((meal) => meal.recipe).filter((recipe): recipe is Recipe => recipe !== null) ??
      []);
    if (recipes.length === 0) {
      setNote("오늘 날짜의 식단이 없습니다. 이번 주 시작일로 다시 만들어 주세요.");
      return;
    }
    const added = logRecipesToday(recipes);
    notifyDaily();
    setNote(added > 0 ? `오늘 끼니 ${added}개를 영양 진행에 담았습니다.` : "오늘 끼니는 이미 영양 진행에 있습니다.");
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl" data-testid="weekly-plan">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">주간 식단표</h1>
          <p className="mt-1 text-sm text-gray-600">
            보유 재료와 제한 조건, 열량·단백질 목표로 7일 치 아침·점심·저녁을 구성합니다.
          </p>
        </div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          재료 수정
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() => void generate(false)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy === "generate" ? "구성 중…" : "이번 주 식단 만들기"}
        </button>
        <button
          type="button"
          disabled={busy !== "" || !plan}
          onClick={() => void generate(true)}
          className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          {busy === "regen" ? "다시 구성 중…" : "고정한 끼니 유지하고 다시 만들기"}
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!plan && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
          아직 만들어진 주간 식단이 없습니다. 홈에 저장한 보유 식재료로 일주일 식단을 만들 수 있습니다.
        </div>
      )}

      {plan && (
        <>
          {plan.usedMock && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              데모 모드입니다. API 키가 없거나 생성에 실패해 내장 레시피로 주간 식단을 구성했습니다.
            </div>
          )}
          {plan.warnings.length > 0 && (
            <div className="mb-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {plan.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="rounded-full bg-gray-100 px-3 py-1">보유: {plan.conditions.ingredients || "없음"}</span>
            {plan.conditions.restrictions && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">제한: {plan.conditions.restrictions}</span>
            )}
            {plan.conditions.goalCalories ? (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700">
                열량 {plan.conditions.goalCalories} kcal
              </span>
            ) : null}
            {plan.conditions.goalProtein ? (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700">
                단백질 {plan.conditions.goalProtein} g
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {plan.days.map((day) => (
              <section key={day.date} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900">
                  {day.date.slice(5)} ({weekdayKo(day.date)})
                  {day.date === todayKey() ? <span className="ml-2 text-xs text-brand-600">오늘</span> : null}
                </h2>
                <ul className="mt-3 space-y-3">
                  {day.meals.map((meal) => {
                    const key = `${day.date}:${meal.slot}`;
                    return (
                      <li key={meal.slot} className="rounded-lg bg-gray-50 px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-semibold text-gray-500">{mealSlotLabel(meal.slot)}</p>
                            <p className="text-sm font-bold text-gray-900">{meal.recipe?.title ?? "추천 없음"}</p>
                            {meal.recipe && (
                              <p className="mt-0.5 text-[11px] text-gray-500">
                                {meal.recipe.nutrition.calories} kcal · 단백질 {meal.recipe.nutrition.protein}g · 탄수{" "}
                                {meal.recipe.nutrition.carbs}g · 지방 {meal.recipe.nutrition.fat}g
                              </p>
                            )}
                          </div>
                          {meal.pinned && <span className="text-[11px] font-semibold text-brand-700">고정</span>}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            disabled={busy !== ""}
                            onClick={() => void swap(day.date, meal.slot)}
                          >
                            {busy === key ? "교체 중…" : "교체"}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100"
                            onClick={() => togglePin(day.date, meal.slot)}
                          >
                            {meal.pinned ? "고정 해제" : "고정"}
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
              7일 쇼핑리스트에 반영
            </button>
            <button
              type="button"
              onClick={logToday}
              className="flex-1 rounded-lg border border-brand-600 px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              오늘 끼니를 영양 기록에 담기
            </button>
          </div>
          {note && (
            <p className="mt-3 text-sm text-brand-700">
              {note}{" "}
              {note.includes("쇼핑리스트") && (
                <Link href="/shopping-list" className="underline">
                  쇼핑리스트 보기
                </Link>
              )}
            </p>
          )}
          <p className="mt-3 text-xs text-gray-400">영양 정보는 참고용입니다.</p>
        </>
      )}
    </div>
  );
}
