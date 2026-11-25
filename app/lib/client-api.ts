import { parseConditions } from "./conditions";
import { isIsoDate } from "./dates";
import { finalizeRecipes, recipesFromLibrary } from "./gemini";
import { createWeeklyPlan, swapWeeklyMeal, type PinnedMeal } from "./mealplan";
import { orderIngredientsForGeneration } from "./pantry";
import type { GenerateResult, MealSlot, Recipe, WeeklyPlan } from "./types";
import { VISION_DEMO_INGREDIENTS } from "./vision-demo";

type ApiFailure = { kind: "unavailable" } | { kind: "error"; message: string };

/** GitHub Pages 빌드에서만 켜진다. 없는 API로 요청을 보내지 않고 데모 경로를 쓴다. */
const staticHost = process.env.NEXT_PUBLIC_STATIC_HOST === "true";

/**
 * GitHub Pages에는 API 라우트가 없다. JSON이 아니면 서버가 없는 것으로 보고
 * 기존 데모 경로(내장 레시피 / 예시 식재료)를 쓴다. 서버가 JSON 오류를 주면 그대로 보여 준다.
 */
async function postJson<T>(
  path: string,
  body: unknown
): Promise<{ ok: true; data: T } | { ok: false; failure: ApiFailure }> {
  if (staticHost) return { ok: false, failure: { kind: "unavailable" } };
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!type.includes("json")) return { ok: false, failure: { kind: "unavailable" } };
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: false, failure: { kind: "unavailable" } };
    }
    if (!res.ok) {
      const message =
        typeof data === "object" &&
        data !== null &&
        typeof (data as { error?: unknown }).error === "string" &&
        (data as { error: string }).error.trim()
          ? (data as { error: string }).error
          : "요청에 실패했습니다.";
      return { ok: false, failure: { kind: "error", message } };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, failure: { kind: "unavailable" } };
  }
}

function remoteError(failure: ApiFailure): string | null {
  switch (failure.kind) {
    case "error":
      return failure.message;
    case "unavailable":
      return null;
    default: {
      const neverFailure: never = failure;
      return neverFailure;
    }
  }
}

export async function requestRecipes(
  body: unknown
): Promise<{ ok: true; result: GenerateResult } | { ok: false; error: string }> {
  const remote = await postJson<GenerateResult>("/api/recipes", body);
  if (remote.ok) return { ok: true, result: remote.data };
  const message = remoteError(remote.failure);
  if (message) return { ok: false, error: message };

  const check = parseConditions(body);
  if (!check.ok) return { ok: false, error: check.error };
  const generation = orderIngredientsForGeneration(check.data, check.expiringIngredients);
  const library = recipesFromLibrary(generation);
  const finalized = finalizeRecipes(library.recipes, generation);
  return {
    ok: true,
    result: {
      conditions: check.data,
      recipes: finalized.recipes,
      warnings: [...library.warnings, ...finalized.warnings],
      usedMock: true,
      provider: "mock",
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function requestWeeklyPlan(input: {
  startDate: string;
  conditions: unknown;
  pinned: PinnedMeal[];
}): Promise<{ ok: true; plan: WeeklyPlan } | { ok: false; error: string }> {
  const remote = await postJson<{ plan?: WeeklyPlan }>("/api/meal-plan", {
    action: "generate",
    startDate: input.startDate,
    conditions: input.conditions,
    pinned: input.pinned,
  });
  if (remote.ok && remote.data.plan) return { ok: true, plan: remote.data.plan };
  if (remote.ok) return { ok: false, error: "주간 식단을 만들지 못했습니다." };
  const message = remoteError(remote.failure);
  if (message) return { ok: false, error: message };

  const check = parseConditions(input.conditions);
  if (!check.ok) return { ok: false, error: check.error };
  if (!check.data.ingredients.trim()) {
    return { ok: false, error: "보유 식재료를 입력한 뒤 주간 식단을 만들어 주세요." };
  }
  if (!isIsoDate(input.startDate)) return { ok: false, error: "시작 날짜가 올바르지 않습니다." };
  try {
    const plan = await createWeeklyPlan({
      conditions: check.data,
      expiringIngredients: check.expiringIngredients,
      startDate: input.startDate,
      pinned: input.pinned,
      allowRemote: false,
    });
    return { ok: true, plan };
  } catch {
    return { ok: false, error: "주간 식단을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function requestMealSwap(input: {
  conditions: unknown;
  slot: MealSlot;
  avoidTitles: string[];
}): Promise<{ ok: true; recipe: Recipe } | { ok: false; error: string }> {
  const remote = await postJson<{ recipe?: Recipe }>("/api/meal-plan", {
    action: "swap",
    conditions: input.conditions,
    slot: input.slot,
    avoidTitles: input.avoidTitles,
  });
  if (remote.ok && remote.data.recipe) return { ok: true, recipe: remote.data.recipe };
  if (remote.ok) return { ok: false, error: "다른 레시피를 찾지 못했습니다." };
  const message = remoteError(remote.failure);
  if (message) return { ok: false, error: message };

  const check = parseConditions(input.conditions);
  if (!check.ok) return { ok: false, error: check.error };
  const swapped = await swapWeeklyMeal({
    conditions: check.data,
    expiringIngredients: check.expiringIngredients,
    slot: input.slot,
    avoidTitles: input.avoidTitles,
    allowRemote: false,
  });
  if (!swapped.recipe) return { ok: false, error: "다른 레시피를 찾지 못했습니다." };
  return { ok: true, recipe: swapped.recipe };
}

export async function requestVision(
  body: FormData
): Promise<{ ok: true; ingredients: string[]; demo: boolean } | { ok: false; error: string }> {
  if (staticHost) return { ok: true, ingredients: [...VISION_DEMO_INGREDIENTS], demo: true };
  try {
    const res = await fetch("/api/vision", { method: "POST", body });
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!type.includes("json")) {
      return { ok: true, ingredients: [...VISION_DEMO_INGREDIENTS], demo: true };
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: true, ingredients: [...VISION_DEMO_INGREDIENTS], demo: true };
    }
    const record = typeof data === "object" && data !== null ? (data as { ingredients?: unknown; demo?: unknown; error?: unknown }) : {};
    if (!res.ok) {
      const message = typeof record.error === "string" && record.error.trim() ? record.error : "사진 인식에 실패했습니다.";
      return { ok: false, error: message };
    }
    const ingredients = Array.isArray(record.ingredients)
      ? record.ingredients.filter((item): item is string => typeof item === "string")
      : [];
    return { ok: true, ingredients, demo: record.demo === true };
  } catch {
    return { ok: true, ingredients: [...VISION_DEMO_INGREDIENTS], demo: true };
  }
}
