import type { Locale } from "../i18n/locale";
import { parseLocale } from "../i18n/locale";
import enSource from "../data/recipes/en.json";
import zhSource from "../data/recipes/zh.json";
import { translateToKorean } from "./alias";
import { mockRecipes } from "./mock";
import { estimateNutrition } from "./nutrition";
import { splitIngredients } from "./shopping";
import type { Recipe, UserConditions } from "./types";

export type LibraryIngredient = { name: string; amount: string };

export type LibraryRecipe = {
  id: string;
  matches: string[];
  main: string;
  category?: "meal" | "side" | "snack" | "dessert";
  title: string;
  description: string;
  ingredients: LibraryIngredient[];
  steps: string[];
  cookMinutes: number;
};

export const ZH_RECIPES = zhSource as LibraryRecipe[];
export const EN_RECIPES = enSource as LibraryRecipe[];

export function localeOf(value: { locale?: string | null } | string | null | undefined): Locale {
  if (typeof value === "string" || value == null) return parseLocale(value);
  return parseLocale(value.locale);
}

export function templatesFor(locale: Locale): LibraryRecipe[] {
  switch (locale) {
    case "zh":
      return ZH_RECIPES;
    case "en":
      return EN_RECIPES;
    default:
      return [];
  }
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/** Compare names after mapping them onto the Korean alias table used by mock.ts. */
function includes(a: string, b: string): boolean {
  const na = normalize(translateToKorean(a));
  const nb = normalize(translateToKorean(b));
  return na.includes(nb) || nb.includes(na);
}

function scaleAmount(amount: string, servings: number, base = 2): string {
  if (!Number.isFinite(servings) || servings <= 0 || servings === base) return amount;
  const factor = servings / base;
  return amount.replace(/^(\d+(?:\.\d+)?)(?!\/)/, (raw) => {
    const next = parseFloat(raw) * factor;
    return Number.isInteger(next) ? String(next) : String(Math.round(next * 10) / 10);
  });
}

function toRecipe(template: LibraryRecipe, c: UserConditions, index: number): Recipe {
  const servings = c.servings > 0 ? c.servings : 2;
  const limit = c.cookMinutes > 0 ? c.cookMinutes : 20;
  const base: Recipe = {
    id: `${template.id}-${Date.now()}-${index}`,
    title: template.title,
    description: template.description,
    ingredients: template.ingredients.map((item) => ({
      name: item.name,
      amount: scaleAmount(item.amount, servings),
    })),
    steps: [...template.steps],
    cookMinutes: Math.min(template.cookMinutes, limit),
    servings,
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  };
  return { ...base, nutrition: estimateNutrition(base) };
}

/**
 * Same selection order as mock.ts: cover owned ingredients, then fill up to 3.
 * Template names are compared after translateToKorean, so 土豆/potato/감자 all hit.
 * mock.ts itself is left unchanged.
 */
export function pickFromTemplates(
  templates: LibraryRecipe[],
  c: UserConditions
): { recipes: Recipe[]; uncovered: string[] } {
  const ownedRaw = splitIngredients(c.ingredients);
  const owned = ownedRaw.map(translateToKorean);
  const restricted = splitIngredients(c.restrictions).map(translateToKorean);
  const usable = owned.filter((x) => !restricted.some((r) => includes(x, r) || includes(r, x)));
  const usableRaw = ownedRaw.filter((_, i) => usable.includes(owned[i]));

  const scored = templates.map((tmpl) => {
    const names = [tmpl.main, ...tmpl.matches, ...tmpl.ingredients.map((ing) => ing.name)];
    const hits = names.filter((n) => usable.some((u) => includes(u, n))).length;
    const primary = tmpl.matches.filter((kw) => usable.some((u) => includes(u, kw))).length;
    const mainIdx = usable.findIndex((u) => includes(u, tmpl.main));
    const mainRank = mainIdx >= 0 ? mainIdx : Number.MAX_SAFE_INTEGER;
    const categoryRank = tmpl.category === "dessert" || tmpl.category === "snack" ? 1 : 0;
    return { tmpl, hits, primary, mainRank, categoryRank, total: tmpl.ingredients.length };
  });

  scored.sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits;
    if (b.primary !== a.primary) return b.primary - a.primary;
    if (a.mainRank !== b.mainRank) return a.mainRank - b.mainRank;
    if (a.categoryRank !== b.categoryRank) return a.categoryRank - b.categoryRank;
    return a.total - b.total;
  });

  const pool = scored.filter((s) => s.hits > 0);
  const picked: LibraryRecipe[] = [];
  const covered = new Set<string>();
  for (const u of usable) {
    if (picked.length >= 3) break;
    if (covered.has(u)) continue;
    const idx = pool.findIndex((s) => {
      const names = [s.tmpl.main, ...s.tmpl.matches, ...s.tmpl.ingredients.map((i) => i.name)];
      return names.some((n) => includes(n, u));
    });
    if (idx < 0) continue;
    const t = pool[idx].tmpl;
    picked.push(t);
    pool.splice(idx, 1);
    const names = [t.main, ...t.matches, ...t.ingredients.map((i) => i.name)];
    for (const uu of usable) {
      if (names.some((n) => includes(uu, n))) covered.add(uu);
    }
  }

  while (picked.length < 3 && pool.length > 0) {
    picked.push(pool.shift()!.tmpl);
  }

  const coveredFinal = new Set<string>();
  for (const t of picked) {
    const names = [t.main, ...t.matches, ...t.ingredients.map((i) => i.name)];
    for (let i = 0; i < usable.length; i++) {
      if (names.some((n) => includes(usable[i], n))) coveredFinal.add(usableRaw[i] ?? usable[i]);
    }
  }
  const uncovered = usableRaw.filter((u, i) => !coveredFinal.has(u) && !coveredFinal.has(usable[i]));
  const recipes = picked.map((tmpl, i) => toRecipe(tmpl, c, i));
  return { recipes, uncovered };
}

export function libraryRecipes(c: UserConditions): { recipes: Recipe[]; uncovered: string[] } {
  const locale = localeOf(c);
  if (locale === "ko") return mockRecipes(c);
  return pickFromTemplates(templatesFor(locale), c);
}

export function randomLibraryPreview(
  locale: Locale,
  servings = 2
): { title: string; desc: string; cookMinutes: number; ingredients: string[] } | null {
  if (locale === "ko") return null;
  const templates = templatesFor(locale);
  if (templates.length === 0) return null;
  const picked = templates[Math.floor(Math.random() * templates.length)];
  return {
    title: picked.title,
    desc: picked.description,
    cookMinutes: picked.cookMinutes,
    ingredients: picked.ingredients.map((item) => `${item.name} ${scaleAmount(item.amount, servings)}`),
  };
}
