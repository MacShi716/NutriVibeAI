import { isIsoDate, weekDates } from "./dates";
import { finalizeRecipes, generateJsonText, type LLMProvider } from "./gemini";
import { mockRecipes } from "./mock";
import { orderIngredientsForGeneration } from "./pantry";
import { splitIngredients } from "./shopping";
import { MEAL_SLOTS, mealSlotLabel } from "./slots";
import type { MealSlot, PlannedMeal, Recipe, UserConditions, WeeklyPlan } from "./types";

export type PinnedMeal = {
  date: string;
  slot: MealSlot;
  recipe: Recipe;
};

const SLOT_SHARE: Record<MealSlot, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.4,
};

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return items;
  const n = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(n), ...items.slice(0, n)];
}

function slotTarget(conditions: UserConditions, slot: MealSlot): number | null {
  if (!conditions.goalCalories || conditions.goalCalories <= 0) return null;
  return Math.round(conditions.goalCalories * SLOT_SHARE[slot]);
}

function withId(recipe: Recipe, id: string): Recipe {
  return { ...recipe, id, ingredients: recipe.ingredients.map((item) => ({ ...item })) };
}

/**
 * 내장 레시피 풀에서 한 끼를 고른다.
 * mock.ts 정렬 규칙은 그대로 두고, 재료를 하나씩·둘씩 넣어 다른 후보를 모은 뒤
 * 덜 쓰인 요리 중에서 끼니 목표 열량에 가까운 것을 고른다.
 */
function pickFromLibrary(
  conditions: UserConditions,
  slot: MealSlot,
  used: Map<string, number>,
  salt: number,
  id: string,
  warnings?: string[]
): Recipe | null {
  const owned = splitIngredients(conditions.ingredients);
  const queries: string[] = [];
  if (owned.length === 0) {
    queries.push(conditions.ingredients);
  } else {
    for (let i = 0; i < owned.length; i++) {
      const first = owned[(salt + i) % owned.length];
      const second = owned[(salt + i + 1) % owned.length];
      queries.push(first);
      if (second !== first) queries.push(`${first}, ${second}`);
    }
    queries.push(rotate(owned, salt).join(", "));
  }
  const pool: Recipe[] = [];
  const seen = new Set<string>();
  for (const ingredients of queries) {
    const mock = mockRecipes({ ...conditions, ingredients });
    for (const recipe of mock.recipes) {
      if (seen.has(recipe.title)) continue;
      seen.add(recipe.title);
      const finalized = finalizeRecipes([recipe], conditions);
      if (!finalized.recipes[0]) {
        warnings?.push(...finalized.warnings);
        continue;
      }
      pool.push(finalized.recipes[0]);
    }
  }
  if (pool.length === 0) return null;
  const counts = pool.map((recipe) => used.get(recipe.title) ?? 0);
  const least = Math.min(...counts);
  const source = pool.filter((recipe) => (used.get(recipe.title) ?? 0) === least);
  const target = slotTarget(conditions, slot);
  const chosen =
    target == null
      ? source[0]
      : source.reduce((best, recipe) =>
          Math.abs(recipe.nutrition.calories - target) < Math.abs(best.nutrition.calories - target) ? recipe : best
        );
  return withId(chosen, id);
}

function isMealSlot(value: unknown): value is MealSlot {
  return value === "breakfast" || value === "lunch" || value === "dinner";
}

function recipeFromUnknown(
  raw: unknown,
  id: string,
  conditions: UserConditions,
  warnings?: string[]
): Recipe | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.title !== "string" || !record.title.trim()) return null;
  if (!Array.isArray(record.ingredients) || !Array.isArray(record.steps)) return null;
  const ingredients = record.ingredients
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const row = item as { name?: unknown; amount?: unknown };
      if (typeof row.name !== "string" || !row.name.trim()) return null;
      return { name: row.name.trim(), amount: typeof row.amount === "string" ? row.amount : "" };
    })
    .filter((item): item is { name: string; amount: string } => item !== null);
  const steps = record.steps.filter((step): step is string => typeof step === "string" && step.trim().length > 0);
  if (ingredients.length === 0 || steps.length === 0) return null;
  const nutrition = (record.nutrition ?? {}) as { calories?: unknown; protein?: unknown; carbs?: unknown; fat?: unknown };
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
  const draft: Recipe = {
    id,
    title: record.title.trim(),
    description: typeof record.description === "string" ? record.description.trim() : "",
    ingredients,
    steps,
    cookMinutes: num(record.cookMinutes) || conditions.cookMinutes,
    servings: num(record.servings) || conditions.servings,
    nutrition: {
      calories: num(nutrition.calories),
      protein: num(nutrition.protein),
      carbs: num(nutrition.carbs),
      fat: num(nutrition.fat),
    },
  };
  const finalized = finalizeRecipes([draft], conditions);
  if (!finalized.recipes[0]) {
    warnings?.push(...finalized.warnings);
    return null;
  }
  return withId(finalized.recipes[0], id);
}

function buildWeekPrompt(conditions: UserConditions, open: { date: string; slot: MealSlot }[]): string {
  const lines = open
    .map((slot) => {
      const target = slotTarget(conditions, slot.slot);
      const protein =
        conditions.goalProtein && conditions.goalProtein > 0
          ? `, 단백질 약 ${Math.round(conditions.goalProtein * SLOT_SHARE[slot.slot])}g`
          : "";
      return `- ${slot.date} ${mealSlotLabel(slot.slot)}${target ? ` (열량 약 ${target} kcal${protein})` : ""}`;
    })
    .join("\n");
  const expiry = conditions.prioritizeExpiring
    ? "- 목록 앞쪽 식재료는 유통기한이 가까우므로 우선 사용할 것"
    : "";
  return [
    "당신은 가정식 식단 전문가입니다. 아래 조건으로 요청한 끼니만 JSON으로 구성하세요.",
    `- 보유 식재료: ${conditions.ingredients || "없음"}`,
    `- 식사 인원: ${conditions.servings}명`,
    `- 조리 시간: ${conditions.cookMinutes}분 이내`,
    conditions.goalCalories ? `- 하루 목표 열량: ${conditions.goalCalories} kcal` : "",
    conditions.goalProtein ? `- 하루 목표 단백질: ${conditions.goalProtein} g` : "",
    `- 식습관 및 선호: ${conditions.preferences || "제한 없음"}`,
    `- 기피 및 알레르기: ${conditions.restrictions || "없음"}`,
    expiry,
    "- 보유 식재료를 우선 사용하고, 제한 식재료는 절대 넣지 말 것",
    "- 같은 요리가 한 주에 반복되지 않게 할 것",
    "- nutrition에는 calories, protein, carbs, fat 숫자를 반드시 넣을 것. 값은 참고용 추정치",
    "- JSON 외의 설명은 출력하지 말 것",
    '{"days":[{"date":"YYYY-MM-DD","meals":[{"slot":"breakfast","title":"요리명","description":"한 줄 설명","ingredients":[{"name":"재료","amount":"200g"}],"steps":["조리 1","조리 2"],"cookMinutes":20,"servings":2,"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}]}]}',
    "요청한 끼니:",
    lines,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function parseWeek(text: string, conditions: UserConditions, warnings?: string[]): Map<string, Recipe> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const json = start >= 0 && end > start ? text.slice(start, end + 1) : text;
  const data = JSON.parse(json) as { days?: unknown };
  const found = new Map<string, Recipe>();
  if (!Array.isArray(data.days)) return found;
  let seq = 0;
  for (const day of data.days) {
    if (typeof day !== "object" || day === null) continue;
    const row = day as { date?: unknown; meals?: unknown };
    if (typeof row.date !== "string" || !Array.isArray(row.meals)) continue;
    for (const meal of row.meals) {
      if (typeof meal !== "object" || meal === null) continue;
      const slot = (meal as { slot?: unknown }).slot;
      if (!isMealSlot(slot)) continue;
      const id = `w-${row.date}-${slot}-${seq}`;
      seq += 1;
      const recipe = recipeFromUnknown(meal, id, conditions, warnings);
      if (recipe) found.set(`${row.date}|${slot}`, recipe);
    }
  }
  return found;
}

function emptyPlan(
  conditions: UserConditions,
  startDate: string,
  provider: LLMProvider,
  usedMock: boolean
): WeeklyPlan {
  return {
    startDate,
    days: weekDates(startDate).map((date) => ({
      date,
      meals: MEAL_SLOTS.map((slot) => ({ slot, recipe: null, pinned: false })),
    })),
    conditions,
    warnings: [],
    usedMock,
    provider,
    generatedAt: new Date().toISOString(),
  };
}

export async function createWeeklyPlan(input: {
  conditions: UserConditions;
  expiringIngredients: string[];
  startDate: string;
  pinned: PinnedMeal[];
  /** false면 브라우저 데모처럼 원격 모델을 호출하지 않고 내장 레시피만 쓴다. */
  allowRemote?: boolean;
}): Promise<WeeklyPlan> {
  if (!isIsoDate(input.startDate)) {
    throw new Error("시작 날짜가 올바르지 않습니다.");
  }
  const generation = orderIngredientsForGeneration(input.conditions, input.expiringIngredients);
  const pinned = new Map<string, PinnedMeal>();
  for (const meal of input.pinned) {
    if (!isIsoDate(meal.date) || !isMealSlot(meal.slot)) continue;
    if (!meal.recipe || typeof meal.recipe.title !== "string") continue;
    pinned.set(`${meal.date}|${meal.slot}`, meal);
  }

  const open: { date: string; slot: MealSlot }[] = [];
  for (const date of weekDates(input.startDate)) {
    for (const slot of MEAL_SLOTS) {
      if (!pinned.has(`${date}|${slot}`)) open.push({ date, slot });
    }
  }

  let provider: LLMProvider = "mock";
  let usedMock = true;
  let generated = new Map<string, Recipe>();
  const warnings: string[] = [];

  if (input.allowRemote !== false && open.length > 0 && splitIngredients(generation.ingredients).length > 0) {
    const ai = await generateJsonText(buildWeekPrompt(generation, open));
    provider = ai.provider;
    usedMock = ai.usedMock;
    if (ai.text) {
      try {
        generated = parseWeek(ai.text, generation, warnings);
        if (generated.size === 0) {
          usedMock = true;
          provider = "mock";
        }
      } catch (err) {
        console.error("[nutrivibe] 주간 식단 JSON 파싱 실패", err instanceof Error ? err.message : "");
        generated = new Map();
        usedMock = true;
        provider = "mock";
      }
    }
  } else if (splitIngredients(generation.ingredients).length === 0) {
    warnings.push("보유 식재료가 없어 식단을 구성하지 못했습니다. 재료를 입력한 뒤 다시 만들어 주세요.");
  }

  const used = new Map<string, number>();
  pinned.forEach((meal) => used.set(meal.recipe.title, (used.get(meal.recipe.title) ?? 0) + 1));
  generated.forEach((recipe) => used.set(recipe.title, (used.get(recipe.title) ?? 0) + 1));

  const days = weekDates(input.startDate).map((date, dayIndex) => {
    const meals: PlannedMeal[] = MEAL_SLOTS.map((slot, slotIndex) => {
      const key = `${date}|${slot}`;
      const locked = pinned.get(key);
      if (locked) {
        return { slot, recipe: locked.recipe, pinned: true };
      }
      const fromAi = generated.get(key);
      if (fromAi) return { slot, recipe: fromAi, pinned: false };
      const picked = pickFromLibrary(generation, slot, used, dayIndex * 3 + slotIndex, `w-${date}-${slot}`, warnings);
      if (picked) {
        used.set(picked.title, (used.get(picked.title) ?? 0) + 1);
        if (!usedMock) warnings.push("일부 끼니는 내장 레시피로 채웠습니다.");
        return { slot, recipe: picked, pinned: false };
      }
      return { slot, recipe: null, pinned: false };
    });
    return { date, meals };
  });

  const made = days.some((day) => day.meals.some((meal) => meal.recipe));
  if (!made) {
    warnings.push("조건에 맞는 레시피를 찾지 못했습니다. 보유 식재료를 바꿔 다시 시도해 주세요.");
  }
  const uniqueWarnings = Array.from(new Set(warnings));

  const plan = emptyPlan(input.conditions, input.startDate, provider, provider === "mock" || usedMock);
  return { ...plan, days, warnings: uniqueWarnings, usedMock: provider === "mock" };
}

export async function swapWeeklyMeal(input: {
  conditions: UserConditions;
  expiringIngredients: string[];
  slot: MealSlot;
  avoidTitles: string[];
  /** false면 원격 모델을 호출하지 않고 내장 레시피만 고른다. */
  allowRemote?: boolean;
}): Promise<{ recipe: Recipe | null; usedMock: boolean; provider: LLMProvider }> {
  const generation = orderIngredientsForGeneration(input.conditions, input.expiringIngredients);
  const avoid = new Map(input.avoidTitles.map((title) => [title, 1]));
  const prompt = [
    "가정식 레시피 하나를 JSON 객체로만 출력하세요.",
    `- 끼니: ${mealSlotLabel(input.slot)}`,
    `- 보유 식재료: ${generation.ingredients || "없음"}`,
    `- 인원: ${generation.servings}명, 조리 ${generation.cookMinutes}분 이내`,
    generation.goalCalories ? `- 이 끼니 목표 열량 약 ${slotTarget(generation, input.slot)} kcal` : "",
    generation.goalProtein
      ? `- 이 끼니 단백질 약 ${Math.round(generation.goalProtein * SLOT_SHARE[input.slot])}g`
      : "",
    `- 선호: ${generation.preferences || "제한 없음"}`,
    `- 제외: ${generation.restrictions || "없음"}`,
    input.avoidTitles.length > 0 ? `- 다음 요리명은 피하세요: ${input.avoidTitles.slice(0, 30).join(", ")}` : "",
    generation.prioritizeExpiring ? "- 목록 앞쪽 재료(유통기한 임박)를 우선 사용" : "",
    "- nutrition.calories, protein, carbs, fat 숫자를 포함할 것",
    '{"title":"","description":"","ingredients":[{"name":"","amount":""}],"steps":["",""],"cookMinutes":20,"servings":2,"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}',
  ]
    .filter((line) => line !== "")
    .join("\n");

  const ai = input.allowRemote === false ? null : await generateJsonText(prompt);
  if (ai?.text) {
    const start = ai.text.indexOf("{");
    const end = ai.text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const recipe = recipeFromUnknown(JSON.parse(ai.text.slice(start, end + 1)), `swap-${Date.now()}`, generation);
        if (recipe && !avoid.has(recipe.title)) {
          return { recipe, usedMock: false, provider: ai.provider };
        }
      } catch {
        // 아래 내장 레시피로 대체
      }
    }
  }
  const picked = pickFromLibrary(generation, input.slot, avoid, Date.now() % 97, `swap-${Date.now()}`);
  return { recipe: picked, usedMock: true, provider: "mock" };
}
