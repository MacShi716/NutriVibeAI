import type { Messages } from "../i18n/messages/types";
import { format } from "../i18n/text";
import type { Recipe } from "./types";

/**
 * Presentation-only helpers for the CSS dish illustrations.
 *
 * Nothing in this file changes recipe matching, nutrition math, or serving
 * amounts. The illustration shows a category and the recipe's own values;
 * it never claims to be a measured portion.
 */

export const DISH_CATEGORIES = [
  "rice",
  "noodles",
  "soup",
  "grill",
  "seafood",
  "salad",
  "vegetable",
  "tofu",
  "egg",
  "pancake",
  "riceCake",
  "dessert",
  "mixed",
] as const;

export type DishCategory = (typeof DISH_CATEGORIES)[number];
export type DishVessel = "plate" | "bowl";
export type DishPortionTier = "single" | "standard" | "family";

export type DishIngredient = { name: string; amount: string };

export type DishInput = {
  title: string;
  ingredients?: readonly DishIngredient[];
};

export type DishPortionFacts = {
  /** The recipe's own serving count, not an illustration estimate. */
  servings: number;
  /** The recipe's own cook time, or null when the recipe does not provide one. */
  cookMinutes: number | null;
  /** Decorative plate scale only. It is never displayed as a measurement. */
  scale: number;
  tier: DishPortionTier;
};

const SALAD_WORDS = ["샐러드", "salad", "沙拉", "沙律"] as const;
const DESSERT_WORDS = [
  "우유",
  "주스",
  "스무디",
  "쉐이크",
  "디저트",
  "케이크",
  "푸딩",
  "빙수",
  "화채",
  "과일",
  "바나나",
  "딸기",
  "smoothie",
  "juice",
  "milk",
  "cake",
  "pudding",
  "dessert",
  "fruit",
  "banana",
  "berry",
  "peach",
  "香蕉",
  "牛奶",
  "果汁",
  "蛋糕",
  "甜点",
  "水果",
] as const;
const NOODLE_WORDS = [
  "국수",
  "파스타",
  "우동",
  "라면",
  "냉면",
  "쫄면",
  "칼국수",
  "당면",
  "잡채",
  "소면",
  "면",
  "noodle",
  "pasta",
  "spaghetti",
  "ramen",
  "udon",
  "vermicelli",
  "面条",
  "意面",
  "乌冬",
  "拉面",
  "粉丝",
  "粉条",
] as const;
const SOUP_WORDS = [
  "찌개",
  "전골",
  "국밥",
  "탕",
  "국",
  "스프",
  "수프",
  "soup",
  "stew",
  "chili",
  "broth",
  "汤",
  "羹",
  "火锅",
  "炖",
] as const;
const RICE_WORDS = [
  "볶음밥",
  "비빔밥",
  "김밥",
  "덮밥",
  "주먹밥",
  "밥",
  "죽",
  "카레",
  "라이스",
  "리조또",
  "risotto",
  "fried rice",
  "rice bowl",
  "rice",
  "curry",
  "bulgur",
  "wheat",
  "quinoa",
  "oat",
  "饭",
  "盖饭",
  "炒饭",
  "粥",
  "咖喱",
] as const;
const PANCAKE_WORDS = ["전", "부침", "전병", "팬케이크", "pancake", "fritter", "煎饼", "饼"] as const;
const EGG_WORDS = ["계란", "달걀", "에그", "egg", "鸡蛋", "蛋"] as const;
const TOFU_WORDS = ["두부", "tofu", "bean curd", "豆腐"] as const;
const SEAFOOD_WORDS = [
  "고등어",
  "연어",
  "새우",
  "오징어",
  "해물",
  "멸치",
  "참치",
  "어묵",
  "조개",
  "꽃게",
  "낙지",
  "문어",
  "생선",
  "장어",
  "갈치",
  "삼치",
  "fish",
  "salmon",
  "shrimp",
  "tuna",
  "squid",
  "seafood",
  "anchovy",
  "oyster",
  "crab",
  "mackerel",
  "鱼",
  "虾",
  "蟹",
  "鱿鱼",
  "三文鱼",
  "金枪鱼",
  "蛤蜊",
] as const;
const VEGETABLE_WORDS = [
  "무침",
  "나물",
  "겉절이",
  "시금치",
  "콩나물",
  "브로콜리",
  "버섯",
  "감자",
  "호박",
  "오이",
  "배추",
  "vegetable",
  "veggie",
  "spinach",
  "broccoli",
  "mushroom",
  "potato",
  "zucchini",
  "cucumber",
  "cabbage",
  "蔬菜",
  "青菜",
  "菠菜",
  "西兰花",
  "蘑菇",
  "土豆",
  "黄瓜",
  "白菜",
] as const;
const GRILL_WORDS = [
  "불고기",
  "갈비",
  "스테이크",
  "구이",
  "수육",
  "조림",
  "볶음",
  "장조림",
  "찜",
  "닭갈비",
  "제육",
  "돈까스",
  "탕수육",
  "커틀릿",
  "미트볼",
  "소시지",
  "햄",
  "베이컨",
  "닭",
  "소고기",
  "돼지",
  "beef",
  "pork",
  "chicken",
  "steak",
  "grilled",
  "roast",
  "stir-fry",
  "stir fry",
  "braised",
  "meat",
  "牛",
  "猪",
  "鸡",
  "肉",
  "烤",
  "炒",
] as const;
const RICE_CAKE_WORDS = ["떡볶이", "떡", "rice cake", "tteok", "年糕", "糕"] as const;
const FALLBACK_CONDIMENT_WORDS = [
  "broth",
  "stock",
  "water",
  "oil",
  "sauce",
  "vinegar",
  "육수",
  "물",
  "기름",
  "간장",
  "소금",
  "설탕",
  "후추",
  "高汤",
  "水",
  "油",
  "酱油",
  "盐",
  "糖",
] as const;
const MEAT_WORDS = [
  "소고기",
  "돼지",
  "닭",
  "양고기",
  "beef",
  "pork",
  "chicken",
  "lamb",
  "meat",
  "牛",
  "猪",
  "鸡",
  "羊",
  "肉",
] as const;

function hasAny(text: string, words: readonly string[]): boolean {
  return words.some((word) => text.includes(word));
}

function compact(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function categoryFromText(text: string): DishCategory {
  const value = compact(text);
  if (!value) return "mixed";

  if (hasAny(value, SALAD_WORDS)) return "salad";
  // Pancake checks before dessert because "pancake" contains "cake".
  if (hasAny(value, PANCAKE_WORDS)) return "pancake";
  if (hasAny(value, DESSERT_WORDS)) return "dessert";
  if (hasAny(value, NOODLE_WORDS)) return "noodles";
  // 탕수육 is a fried meat dish, not a soup, although its name contains 탕.
  if (!value.includes("탕수육") && hasAny(value, SOUP_WORDS)) return "soup";
  if (hasAny(value, RICE_WORDS)) return "rice";
  if (hasAny(value, EGG_WORDS)) return "egg";
  if (hasAny(value, TOFU_WORDS)) return "tofu";
  if (hasAny(value, SEAFOOD_WORDS)) return "seafood";

  const vegetableStirFry =
    value.includes("볶음") && !hasAny(value, MEAT_WORDS) && !hasAny(value, SEAFOOD_WORDS);
  if (hasAny(value, VEGETABLE_WORDS) || vegetableStirFry) return "vegetable";

  if (hasAny(value, GRILL_WORDS)) return "grill";
  if (hasAny(value, RICE_CAKE_WORDS)) return "riceCake";
  return "mixed";
}

/**
 * Recognizable category from the dish name first, then from its ingredients.
 * The title wins so ingredient words such as "cream of chicken soup" do not
 * turn a chicken main into a soup illustration.
 */
export function inferDishCategory(input: DishInput): DishCategory {
  const fromTitle = categoryFromText(input.title);
  if (fromTitle !== "mixed") return fromTitle;
  const meaningful = (input.ingredients ?? [])
    .map((item) => compact(item.name))
    .filter((name) => name.length > 0 && !hasAny(name, FALLBACK_CONDIMENT_WORDS));
  return categoryFromText(meaningful.join(" "));
}

export function vesselForDish(category: DishCategory, title: string): DishVessel {
  const value = compact(title);
  if (category === "soup" || category === "noodles" || category === "salad") return "bowl";
  if (category === "dessert") return "bowl";
  if (category === "riceCake") {
    return /볶이|국|汤|炒/.test(value) ? "bowl" : "plate";
  }
  return "plate";
}

/** The displayed serving count and cook time are the recipe's own values. */
export function portionFacts(recipe: Pick<Recipe, "servings" | "cookMinutes">): DishPortionFacts {
  const rawServings = Number(recipe.servings);
  const servings = Number.isFinite(rawServings) && rawServings > 0 ? rawServings : 1;
  const rawMinutes = Number(recipe.cookMinutes);
  const cookMinutes = Number.isFinite(rawMinutes) && rawMinutes > 0 ? Math.round(rawMinutes) : null;
  // Decorative only. The caption always shows the exact serving count.
  const scale = Math.round(Math.min(1.16, Math.max(0.84, 0.8 + Math.min(servings, 8) * 0.045)) * 1000) / 1000;
  const tier: DishPortionTier = servings <= 1 ? "single" : servings <= 2 ? "standard" : "family";
  return { servings, cookMinutes, scale, tier };
}

const CONDIMENT_WORDS = [
  "기름",
  "간장",
  "소금",
  "설탕",
  "후추",
  "고추장",
  "된장",
  "물",
  "육수",
  "식초",
  "마늘",
  "생강",
  "참기름",
  "oil",
  "sauce",
  "salt",
  "sugar",
  "pepper",
  "water",
  "broth",
  "vinegar",
  "garlic",
  "ginger",
  "syrup",
  "油",
  "酱油",
  "盐",
  "糖",
  "水",
  "醋",
  "蒜",
] as const;
const CORE_INGREDIENT_WORDS = [
  ...MEAT_WORDS,
  ...SEAFOOD_WORDS,
  ...TOFU_WORDS,
  ...EGG_WORDS,
  "쌀",
  "밥",
  "면",
  "파스타",
  "감자",
  "양파",
  "당근",
  "버섯",
  "시금치",
  "브로콜리",
  "오이",
  "배추",
  "호박",
  "토마토",
  "김치",
  "치즈",
  "콩",
  "rice",
  "noodle",
  "pasta",
  "potato",
  "onion",
  "carrot",
  "mushroom",
  "spinach",
  "broccoli",
  "tomato",
  "kimchi",
  "cheese",
  "bean",
  "米",
  "饭",
  "面",
  "土豆",
  "洋葱",
  "胡萝卜",
  "蘑菇",
  "番茄",
  "泡菜",
  "奶酪",
] as const;

/**
 * Pick a couple of existing ingredient rows to print under the illustration.
 * Amounts are copied verbatim from the recipe; no amount is estimated.
 */
export function keyIngredientFacts(
  recipe: Pick<Recipe, "ingredients">,
  limit = 2
): DishIngredient[] {
  const rows = recipe.ingredients
    .map((item, index) => ({
      name: item.name.trim(),
      amount: item.amount.trim(),
      index,
    }))
    .filter((item) => item.name.length > 0 && item.amount.length > 0)
    .filter((item, index, all) => all.findIndex((other) => other.name === item.name) === index)
    .map((item) => {
      const value = compact(item.name);
      let score = 0;
      if (hasAny(value, CORE_INGREDIENT_WORDS)) score += 4;
      if (hasAny(value, CONDIMENT_WORDS)) score -= 4;
      // Earlier rows usually describe the main ingredient; use them as a tie-break.
      score += Math.max(0, 2 - item.index) * 0.1;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, Math.floor(limit)))
    .sort((a, b) => a.index - b.index);

  return rows.map((item) => ({ name: item.name, amount: item.amount }));
}

export function dishCategoryLabel(t: Messages, category: DishCategory): string {
  return t.dish.categories[category];
}

/** Accessible description. It explicitly calls the drawing a reference image. */
export function dishAriaLabel(
  recipe: Pick<Recipe, "title" | "ingredients" | "servings" | "cookMinutes">,
  t: Messages
): string {
  const category = inferDishCategory(recipe);
  const portion = portionFacts(recipe);
  const values = {
    title: recipe.title.trim(),
    category: dishCategoryLabel(t, category),
    servings: portion.servings,
  };
  const description =
    portion.cookMinutes === null
      ? format(t.dish.ariaNoTime, values)
      : format(t.dish.ariaLabel, { ...values, minutes: portion.cookMinutes });
  return `${description}${t.dish.ariaNoteSeparator}${t.dish.illustrationNote}`;
}
