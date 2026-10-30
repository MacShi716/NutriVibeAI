import type { Recipe, RecipeIngredient } from "./types";
import nutritionData from "@/data/nutrition-data.json";

type NutritionRow = {
  name: string;
  caloriesPer: number;
  proteinPer: number;
  carbsPer: number;
  fatPer: number;
  unit: string;
};

type RawNutritionRow = {
  name: string;
  unit: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fat_per_100g?: number;
  calories_per_100ml?: number;
  protein_per_100ml?: number;
  carbs_per_100ml?: number;
  fat_per_100ml?: number;
};

const DATA: NutritionRow[] = (nutritionData as RawNutritionRow[]).map((row) => ({
  name: row.name,
  unit: row.unit,
  caloriesPer: row.calories_per_100g ?? row.calories_per_100ml ?? 0,
  proteinPer: row.protein_per_100g ?? row.protein_per_100ml ?? 0,
  carbsPer: row.carbs_per_100g ?? row.carbs_per_100ml ?? 0,
  fatPer: row.fat_per_100g ?? row.fat_per_100ml ?? 0,
}));

/** 내장 영양 참고 데이터에 등록된 총 식재료 수 (도감 진행률 표시용) */
export const TOTAL_INGREDIENTS = DATA.length;

/** 재료명과 사용량 문자열에서 수량(숫자)을 추출한다. 예: "닭가슴살 200g" -> { name: "닭가슴살", amount: 200 } */
export function parseIngredient(raw: string): { name: string; grams: number | null } {
  const match = raw.match(/^([^\d]+?)\s*(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?\s*(kg|g|ml|l|그램|밀리리터|리터|컵|개|알|모|대|쪽|마리|공기|큰술|작은술|tbsp|tsp)?/i);
  if (!match) {
    return { name: raw.trim(), grams: null };
  }
  const name = match[1].trim();
  let value = parseFloat(match[2]);
  const denom = match[3] ? parseFloat(match[3]) : 0;
  if (denom > 0) value = value / denom; // fractions such as "1/2"
  const unit = match[4] ?? "";
  let grams: number | null = value;
  if (unit === "개") grams = value * 50; // 계란 등 1개 기준 대략 50g
  else if (unit === "컵") grams = value * 150;
  else if (unit === "큰술") grams = value * 15;
  else if (unit === "작은술") grams = value * 5;
  else if (unit.toLowerCase() === "tbsp") grams = value * 15;
  else if (unit.toLowerCase() === "tsp") grams = value * 5;
  else if (unit === "ml") grams = value;
  else if (unit === "kg") grams = value * 1000;
  else if (unit === "l" || unit === "L" || unit === "리터") grams = value * 1000;
  else if (unit === "알") grams = value * 50; // 계란
  else if (unit === "모") grams = value * 300; // 두부 1모
  else if (unit === "대") grams = value * 40; // 대파 1대
  else if (unit === "쪽") grams = value * 5; // 마늘 1쪽
  else if (unit === "마리") grams = value * 1000; // 닭 1마리 (대략)
  else if (unit === "공기") grams = value * 210; // 밥 1공기
  return { name, grams };
}

// AI 가 쓰는 흔한 표기를 내부 데이터 이름으로 대응시킨다
const NAME_SYNONYMS: Record<string, string> = { 계란: "달걀" };

export function lookupNutrition(name: string): NutritionRow | undefined {
  const exact = DATA.find((row) => row.name === name);
  if (exact) return exact;
  // "소고기(채끝)" -> "소고기", "계란" -> "달걀"
  const cleaned = name.replace(/\([^)]*\)/g, "").replace(/\s+/g, "");
  const mapped = NAME_SYNONYMS[cleaned] ?? cleaned;
  const direct = DATA.find((row) => row.name === mapped);
  if (direct) return direct;
  // "다진 마늘", "돼지고기 등심" 처럼 내부 이름을 포함하는 경우: 가장 긴 이름(2자 이상) 우선
  let best: NutritionRow | undefined;
  for (const row of DATA) {
    if (row.name.length >= 2 && mapped.includes(row.name) && (!best || row.name.length > best.name.length)) {
      best = row;
    }
  }
  return best;
}

function calcNutrition(ingredients: RecipeIngredient[]) {
  return calcNutritionDetail(ingredients).totals;
}

export function estimateNutrition(recipe: Recipe): Recipe["nutrition"] {
  const base = calcNutrition(recipe.ingredients);
  return {
    calories: base.calories,
    protein: base.protein,
    carbs: base.carbs,
    fat: base.fat,
    note: "내부 영양 참고 데이터(nutrition-data.json) 기반 추정치이며 참고용입니다.",
  };
}

type NutritionDetailRow = {
  name: string;
  amount: string;
  grams: number | null;
  caloriesPer100: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

/** 재료별 열량 상세 계산: 각 재료의 사용량(g)과 평균 열량으로 개별 열량을 산출한다 */
export function calcNutritionDetail(
  ingredients: RecipeIngredient[]
): { rows: NutritionDetailRow[]; totals: { calories: number; protein: number; carbs: number; fat: number } } {
  const rows: NutritionDetailRow[] = [];
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const ing of ingredients) {
    const { name, grams } = parseIngredient(ing.name + " " + ing.amount);
    const row = lookupNutrition(name);
    if (!row || grams === null) {
      rows.push({
        name: ing.name,
        amount: ing.amount,
        grams,
        caloriesPer100: row?.caloriesPer ?? null,
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
      });
      continue;
    }
    const c = (row.caloriesPer * grams) / 100;
    const p = (row.proteinPer * grams) / 100;
    const ca = (row.carbsPer * grams) / 100;
    const f = (row.fatPer * grams) / 100;
    calories += c;
    protein += p;
    carbs += ca;
    fat += f;
    rows.push({
      name: ing.name,
      amount: ing.amount,
      grams,
      caloriesPer100: row.caloriesPer,
      calories: Math.round(c),
      protein: Math.round(p * 10) / 10,
      carbs: Math.round(ca * 10) / 10,
      fat: Math.round(f * 10) / 10,
    });
  }
  return {
    rows,
    totals: {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    },
  };
}
