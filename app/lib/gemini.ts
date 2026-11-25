import type { Recipe, UserConditions } from "./types";
import { splitIngredients } from "./shopping";
import { estimateNutrition } from "./nutrition";
import { translateToKorean } from "./alias";
import { libraryRecipes, localeOf } from "./recipe-library";

// ============================================================ 프롬프트

export function buildPrompt(c: UserConditions): string {
  const goalLine =
    c.goalCalories && c.goalCalories > 0
      ? `- 목표 일일 열량: ${c.goalCalories} kcal (이 끼니는 하루 권장 열량의 약 30% 수준으로 조정)`
      : "";
  const proteinLine =
    c.goalProtein && c.goalProtein > 0
      ? `- 목표 일일 단백질: ${c.goalProtein} g (이 끼니는 하루 목표의 약 30% 수준으로 맞출 것)`
      : "";
  const expiryLine = c.prioritizeExpiring
    ? "- 목록 앞쪽의 식재료는 유통기한이 가까우므로 그 재료를 우선 사용할 것"
    : "";
  const locale = localeOf(c);
  const languageLine =
    locale === "zh"
      ? "- 全部用简体中文撰写菜名、简介、食材名和步骤，做中国家常菜，不要使用韩文菜名。"
      : locale === "en"
        ? "- Write titles, descriptions, ingredient names, and steps in natural English. Suggest everyday home recipes, not Korean dish names."
        : "- 레시피 제목, 설명, 재료명, 조리 단계는 정중한 한국어로 작성하고, 한국 가정식을 제안할 것";
  return [
    "당신은 가정식 레시피 전문가입니다. 아래 조건을 바탕으로 2~3개의 레시피를 JSON 형식으로 생성하세요.",
    languageLine,
    `- 보유 식재료: ${c.ingredients || "없음"}`,
    `- 식사 인원: ${c.servings}명`,
    `- 조리 시간: ${c.cookMinutes}분 이내`,
    goalLine,
    proteinLine,
    expiryLine,
    `- 식습관 및 선호: ${c.preferences || "제한 없음"}`,
    `- 기피 및 알레르기: ${c.restrictions || "없음"}`,
    "- 보유 식재료를 최우선으로 활용할 것",
    "- 제한 식재료는 어떤 경우에도 사용하지 말 것",
    "- 결과는 반드시 아래 JSON 형식으로만 출력하고, JSON 외의 설명은 출력하지 말 것",
    "- 최상위는 반드시 \"recipes\" 배열을 가진 JSON 객체여야 하며(배열 단독 출력 금지), 마크다운 코드 블록 없이 JSON만 출력할 것",
    '{"recipes":[{"title":"레시피명","description":"한 줄 설명","ingredients":[{"name":"재료명","amount":"수량(예: 200g)"}],"steps":["조리 단계 1","조리 단계 2"],"cookMinutes":조리시간,"servings":인원,"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}]}',
    "- 재료명은 괄호 없이 일반적인 명칭(예: 소고기, 달걀, 두부)으로, 수량은 g, ml, 개, 큰술, 작은술 단위로 적을 것",
    "- 식재료로 볼 수 없는 입력은 사용하지 말고, 사용할 수 있는 식재료가 전혀 없으면 {\"recipes\":[]} 만 출력할 것",
    "- 영양 수치는 추정치이며 참고용으로만 기재할 것",
    "- 의료적 조언을 제공하지 말 것",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// ============================================================ JSON 파싱/검증

function cleanJsonText(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  // 객체({...}) 또는 배열([...]) 어느 쪽이든 첫 여는 괄호 ~ 마지막 닫는 괄호까지 추출
  const braceStart = t.indexOf("{");
  const bracketStart = t.indexOf("[");
  const starts = [braceStart, bracketStart].filter((i) => i >= 0);
  const start = starts.length > 0 ? Math.min(...starts) : -1;
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (start >= 0 && end > start) {
    t = t.slice(start, end + 1);
  }
  return t;
}

function isRecipeLike(x: unknown): x is Recipe {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.title === "string" &&
    typeof r.description === "string" &&
    Array.isArray(r.ingredients) &&
    Array.isArray(r.steps) &&
    typeof r.cookMinutes === "number" &&
    typeof r.servings === "number"
  );
}

export function parseRecipes(jsonText: string): Recipe[] {
  const data = JSON.parse(cleanJsonText(jsonText)) as unknown;
  // {"recipes":[...]}, 최상위 배열 [...], 단일 레시피 객체 {...} 를 모두 허용한다
  let list: unknown[];
  if (Array.isArray(data)) {
    list = data;
  } else if (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { recipes?: unknown }).recipes)
  ) {
    list = (data as { recipes: unknown[] }).recipes;
  } else if (isRecipeLike(data)) {
    list = [data];
  } else {
    throw new Error("JSON에 recipes 배열이 없습니다.");
  }
  const recipes = list.filter(isRecipeLike).map((r, i) => ({
    ...r,
    id: `r-${Date.now()}-${i}`,
    nutrition: {
      calories: Number(r.nutrition?.calories ?? 0) || 0,
      protein: Number(r.nutrition?.protein ?? 0) || 0,
      carbs: Number(r.nutrition?.carbs ?? 0) || 0,
      fat: Number(r.nutrition?.fat ?? 0) || 0,
      note: "AI 생성 참고 수치이며, 실제 영양 정보는 내부 데이터 기준으로 재계산됩니다.",
    },
  }));
  if (recipes.length === 0) {
    throw new Error("유효한 레시피가 없습니다.");
  }
  return recipes;
}

// ============================================================ 알레르기/기피 필터링

function normalizeName(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function filterByRestrictions(recipes: Recipe[], restrictionsRaw: string): {
  recipes: Recipe[];
  warnings: string[];
} {
  // 중국어 등으로 입력한 제한 재료도 한글 재료명으로 변환하여 대조한다
  const restricted = splitIngredients(restrictionsRaw).map(translateToKorean);
  if (restricted.length === 0) return { recipes, warnings: [] };
  const warnings: string[] = [];
  const kept: Recipe[] = [];
  for (const recipe of recipes) {
    const bad = recipe.ingredients.filter((ing) =>
      restricted.some(
        (r) =>
          normalizeName(translateToKorean(ing.name)).includes(r) ||
          r.includes(normalizeName(translateToKorean(ing.name)))
      )
    );
    if (bad.length > 0) {
      warnings.push(
        `${recipe.title}: 제한 재료(${bad.map((b) => b.name).join(", ")})가 포함되어 제외되었습니다.`
      );
    } else {
      kept.push(recipe);
    }
  }
  return { recipes: kept, warnings };
}

// ============================================================ 제공방 이름

export type LLMProvider = "zhipu" | "mock";

export type JsonTextGenerator = (prompt: string) => Promise<{
  text: string | null;
  provider: LLMProvider;
  usedMock: boolean;
}>;

/** 제한 재료 제외 후 내부 영양 데이터로 탄수화물·단백질·지방을 다시 계산한다. */
export function finalizeRecipes(recipes: Recipe[], c: UserConditions): {
  recipes: Recipe[];
  warnings: string[];
} {
  const filtered = filterByRestrictions(recipes, c.restrictions);
  let next = filtered.recipes.map((recipe) => ({
    ...recipe,
    nutrition: estimateNutrition(recipe),
  }));
  const warnings = [...filtered.warnings];
  const goal = c.goalCalories;
  if (goal && goal > 0) {
    next = next.map((recipe) => ({
      ...recipe,
      nutrition: {
        ...recipe.nutrition,
        goalPct: Math.round((recipe.nutrition.calories / goal) * 100),
      },
    }));
    const high = next.filter((recipe) => (recipe.nutrition.goalPct ?? 0) > 115);
    if (high.length > 0) {
      warnings.push(
        `목표 열량(${goal} kcal) 대비 높은 레시피가 있습니다: ${high
          .map((recipe) => `${recipe.title}(${recipe.nutrition.goalPct}%)`)
          .join(", ")}. 참고용 안내이며 필요 시 다른 레시피를 선택하세요.`
      );
    }
  }
  return { recipes: next, warnings };
}

/** 키가 없거나 모델 응답이 비었을 때 쓰는 내장 레시피. mock.ts 매칭 규칙은 바꾸지 않는다. */
export function recipesFromLibrary(c: UserConditions): { recipes: Recipe[]; warnings: string[] } {
  const library = libraryRecipes(c);
  const warnings: string[] = [];
  if (library.uncovered.length > 0) {
    warnings.push(
      `입력한 식재료 중 일부(${library.uncovered.join(", ")})를 사용하는 레시피가 내장 라이브러리에 없어 추천에 반영되지 않았습니다. 다른 재료와 함께 시도해 주세요.`
    );
  }
  return { recipes: library.recipes, warnings };
}

