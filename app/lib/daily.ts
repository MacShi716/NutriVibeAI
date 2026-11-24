import { estimateDailyCalories } from "./profile";
import { storage } from "./storage";
import type { DailyEntry, Recipe } from "./types";

export const DAILY_EVENT = "nutrivibe:daily";

export type MacroGoals = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  carbsIsReference: boolean;
  fatIsReference: boolean;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 진행 막대는 한 사람이 먹는 양으로 본다. */
export function perServingMacros(recipe: Recipe): Pick<DailyEntry, "calories" | "protein" | "carbs" | "fat"> {
  const servings = recipe.servings > 0 ? recipe.servings : 1;
  return {
    calories: Math.round((recipe.nutrition.calories || 0) / servings),
    protein: round1((recipe.nutrition.protein || 0) / servings),
    carbs: round1((recipe.nutrition.carbs || 0) / servings),
    fat: round1((recipe.nutrition.fat || 0) / servings),
  };
}

export function isLoggedToday(id: string): boolean {
  return storage.getDailyLog().entries.some((entry) => entry.id === id);
}

export function toggleDailyLog(recipe: Recipe): boolean {
  const log = storage.getDailyLog();
  const idx = log.entries.findIndex((entry) => entry.id === recipe.id);
  if (idx >= 0) {
    log.entries.splice(idx, 1);
    storage.saveDailyLog(log);
    return false;
  }
  log.entries.unshift({
    id: recipe.id,
    title: recipe.title,
    ...perServingMacros(recipe),
    loggedAt: new Date().toISOString(),
  });
  storage.saveDailyLog(log);
  return true;
}

export function logRecipesToday(recipes: Recipe[]): number {
  const log = storage.getDailyLog();
  let added = 0;
  for (const recipe of recipes) {
    if (log.entries.some((entry) => entry.id === recipe.id)) continue;
    log.entries.push({
      id: recipe.id,
      title: recipe.title,
      ...perServingMacros(recipe),
      loggedAt: new Date().toISOString(),
    });
    added += 1;
  }
  if (added > 0) storage.saveDailyLog(log);
  return added;
}

export function notifyDaily(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DAILY_EVENT));
}

/**
 * 열량·단백질은 프로필(또는 조건) 목표.
 * 탄수화물·지방은 남은 열량을 7:3으로 나눈 참고 배분이다.
 */
export function resolveMacroGoals(): MacroGoals {
  const profile = storage.getProfile();
  const conditions = storage.getConditions();
  let calories: number | null = null;
  if (profile) {
    const estimate = estimateDailyCalories(profile);
    if (estimate) calories = estimate.dailyCalories;
  }
  if (calories == null && conditions?.goalCalories) calories = conditions.goalCalories;

  const protein = profile?.proteinGoalG ?? conditions?.goalProtein ?? null;
  let carbs: number | null = null;
  let fat: number | null = null;
  if (calories && calories > 0) {
    const proteinKcal = protein && protein > 0 ? protein * 4 : calories * 0.2;
    const rest = Math.max(0, calories - proteinKcal);
    carbs = Math.round((rest * 0.7) / 4);
    fat = Math.round((rest * 0.3) / 9);
  }
  return {
    calories,
    protein: protein && protein > 0 ? protein : null,
    carbs,
    fat,
    carbsIsReference: carbs != null,
    fatIsReference: fat != null,
  };
}
