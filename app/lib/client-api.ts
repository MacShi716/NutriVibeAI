import { parseConditions } from "./conditions";
import { isIsoDate } from "./dates";
import { finalizeRecipes, recipesFromLibrary } from "./gemini";
import { HAS_RELAY, RELAY_URL, STATIC_HOST } from "./host";
import { createWeeklyPlan, swapWeeklyMeal, type PinnedMeal } from "./mealplan";
import { orderIngredientsForGeneration } from "./pantry";
import { storage } from "./storage";
import type { GenerateResult, MealSlot, Recipe, WeeklyPlan } from "./types";
import { demoVisionIngredients, ingredientMatchesRestriction } from "./vision-demo";

type ApiFailure = { kind: "unavailable" } | { kind: "error"; message: string };

const GENERIC_RELAY_ERRORS = new Set([
  "upstream",
  "not_configured",
  "rate_limited",
  "rate limited",
  "bad_request",
  "payload_too_large",
  "method_not_allowed",
  "origin_not_allowed",
  "ai error",
  "ai not configured",
  "empty answer",
]);

function currentRestrictions(): string {
  return storage.getConditions()?.restrictions ?? "";
}

function withoutRestricted(ingredients: string[], restrictions: string): string[] {
  return ingredients.filter((name) => !ingredientMatchesRestriction(name, restrictions));
}

function recipesUrl(): string | null {
  if (HAS_RELAY) return RELAY_URL;
  if (STATIC_HOST) return null;
  return "/api/recipes";
}

function mealPlanUrl(): string | null {
  if (HAS_RELAY) return RELAY_URL;
  if (STATIC_HOST) return null;
  return "/api/meal-plan";
}

function visionUrl(): string | null {
  if (HAS_RELAY) return RELAY_URL;
  if (STATIC_HOST) return null;
  return "/api/vision";
}

function withRelayTask(body: unknown, task: string): unknown {
  if (!HAS_RELAY) return body;
  if (typeof body === "object" && body !== null) {
    return { ...(body as Record<string, unknown>), task };
  }
  return { task };
}

function isGenericError(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  return GENERIC_RELAY_ERRORS.has(trimmed) || trimmed.length === 0;
}

/**
 * 중계 또는 같은 출처 API로 JSON을 보낸다.
 * GitHub Pages에는 /api 가 없으므로 중계 주소가 있을 때만 원격 호출한다.
 * 중계가 없거나 실패하면 내장 레시피 경로로 넘어가도록 unavailable 을 돌려준다.
 * 업스트림 본문이나 내부 오류 코드는 화면에 그대로 보여 주지 않는다.
 */
async function postJson<T>(
  url: string | null,
  body: unknown
): Promise<{ ok: true; data: T } | { ok: false; failure: ApiFailure }> {
  if (!url) return { ok: false, failure: { kind: "unavailable" } };
  try {
    const res = await fetch(url, {
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
      if (res.status === 429 || res.status === 502 || res.status === 503) {
        return { ok: false, failure: { kind: "unavailable" } };
      }
      const message =
        typeof data === "object" &&
        data !== null &&
        typeof (data as { error?: unknown }).error === "string" &&
        (data as { error: string }).error.trim()
          ? (data as { error: string }).error
          : "요청에 실패했습니다.";
      if (isGenericError(message)) {
        return { ok: false, failure: { kind: "unavailable" } };
      }
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
  const remote = await postJson<GenerateResult & { recipes?: Recipe[] }>(
    recipesUrl(),
    withRelayTask(body, "recipes")
  );
  if (remote.ok) {
    const check = parseConditions(body);
    if (!check.ok) return { ok: false, error: check.error };
    const generation = orderIngredientsForGeneration(check.data, check.expiringIngredients);
    const incoming = Array.isArray(remote.data.recipes) ? remote.data.recipes : [];
    if (incoming.length === 0) {
      // fall through to library
    } else {
      const finalized = finalizeRecipes(incoming, generation);
      return {
        ok: true,
        result: {
          conditions: check.data,
          recipes: finalized.recipes,
          warnings: [...(Array.isArray(remote.data.warnings) ? remote.data.warnings : []), ...finalized.warnings],
          usedMock: remote.data.usedMock === true,
          provider: remote.data.provider === "zhipu" ? "zhipu" : remote.data.usedMock ? "mock" : "zhipu",
          generatedAt: typeof remote.data.generatedAt === "string" ? remote.data.generatedAt : new Date().toISOString(),
        },
      };
    }
  } else {
    const message = remoteError(remote.failure);
    if (message) return { ok: false, error: message };
  }

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
  const payload = HAS_RELAY
    ? { task: "meal_plan", startDate: input.startDate, conditions: input.conditions, pinned: input.pinned }
    : {
        action: "generate",
        startDate: input.startDate,
        conditions: input.conditions,
        pinned: input.pinned,
      };
  const remote = await postJson<{ plan?: WeeklyPlan; text?: string; provider?: string }>(mealPlanUrl(), payload);
  if (remote.ok && remote.data.plan) return { ok: true, plan: remote.data.plan };
  if (remote.ok && typeof remote.data.text === "string" && remote.data.text.trim()) {
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
        aiText: remote.data.text,
        aiProvider: remote.data.provider === "zhipu" ? "zhipu" : "zhipu",
      });
      return { ok: true, plan };
    } catch {
      return { ok: false, error: "주간 식단을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }
  }
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
  const payload = HAS_RELAY
    ? { task: "swap", conditions: input.conditions, slot: input.slot, avoidTitles: input.avoidTitles }
    : {
        action: "swap",
        conditions: input.conditions,
        slot: input.slot,
        avoidTitles: input.avoidTitles,
      };
  const remote = await postJson<{ recipe?: Recipe; provider?: string }>(mealPlanUrl(), payload);
  if (remote.ok && remote.data.recipe) {
    const check = parseConditions(input.conditions);
    if (!check.ok) return { ok: false, error: check.error };
    const swapped = await swapWeeklyMeal({
      conditions: check.data,
      expiringIngredients: check.expiringIngredients,
      slot: input.slot,
      avoidTitles: input.avoidTitles,
      allowRemote: false,
      aiRecipe: remote.data.recipe,
      aiProvider: "zhipu",
    });
    if (swapped.recipe) return { ok: true, recipe: swapped.recipe };
  }
  if (remote.ok && !remote.data.recipe) return { ok: false, error: "다른 레시피를 찾지 못했습니다." };
  if (!remote.ok) {
    const message = remoteError(remote.failure);
    if (message) return { ok: false, error: message };
  }

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

function fileAsDataUrl(file: File): Promise<string | null> {
  if (file.size <= 0) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result || null);
    };
    reader.onerror = () => reject(reader.error ?? new Error("image read failed"));
    reader.readAsDataURL(file);
  });
}

export async function requestVision(
  body: FormData
): Promise<{ ok: true; ingredients: string[]; demo: boolean } | { ok: false; error: string }> {
  const restrictions = currentRestrictions();
  const url = visionUrl();
  if (!url) return { ok: true, ingredients: demoVisionIngredients(restrictions), demo: true };
  try {
    if (restrictions && !body.has("restrictions")) body.append("restrictions", restrictions);

    let res: Response;
    if (HAS_RELAY) {
      const uploaded = body.get("image");
      const file = uploaded instanceof File ? uploaded : null;
      if (!file) return { ok: false, error: "이미지 파일을 선택해 주세요." };
      const image = await fileAsDataUrl(file);
      if (!image) return { ok: false, error: "이미지 파일을 선택해 주세요." };
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "vision",
          image,
          mimeType: file.type,
          restrictions,
        }),
      });
    } else {
      res = await fetch(url, { method: "POST", body });
    }

    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!type.includes("json")) {
      return { ok: true, ingredients: demoVisionIngredients(restrictions), demo: true };
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: true, ingredients: demoVisionIngredients(restrictions), demo: true };
    }
    const record = typeof data === "object" && data !== null ? (data as { ingredients?: unknown; demo?: unknown; error?: unknown }) : {};
    if (!res.ok) {
      if (res.status === 429 || res.status === 502 || res.status === 503) {
        return { ok: true, ingredients: demoVisionIngredients(restrictions), demo: true };
      }
      const message = typeof record.error === "string" && record.error.trim() ? record.error : "사진 인식에 실패했습니다.";
      if (isGenericError(message)) {
        return { ok: true, ingredients: demoVisionIngredients(restrictions), demo: true };
      }
      return { ok: false, error: message };
    }
    const ingredients = Array.isArray(record.ingredients)
      ? record.ingredients.filter((item): item is string => typeof item === "string")
      : [];
    const demo = record.demo === true;
    return { ok: true, ingredients: demo ? withoutRestricted(ingredients, restrictions) : ingredients, demo };
  } catch {
    return { ok: true, ingredients: demoVisionIngredients(restrictions), demo: true };
  }
}
