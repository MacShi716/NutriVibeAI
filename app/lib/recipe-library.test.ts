import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { finalizeRecipes } from "./gemini";
import { EN_RECIPES, ZH_RECIPES, libraryRecipes, localeOf } from "./recipe-library";
import { parseRestrictionSelection, RESTRICTION_PRESETS } from "./restrictions";
import type { UserConditions } from "./types";

const HANGUL = /[\uac00-\ud7a3]/;

function conditions(partial: Partial<UserConditions>): UserConditions {
  return {
    ingredients: "",
    preferences: "",
    restrictions: "",
    servings: 2,
    cookMinutes: 30,
    ...partial,
  };
}

describe("locale recipe libraries", () => {
  it("keeps a useful built-in set for each language", () => {
    assert.ok(ZH_RECIPES.length >= 40, `zh count ${ZH_RECIPES.length}`);
    assert.ok(EN_RECIPES.length >= 40, `en count ${EN_RECIPES.length}`);
    assert.ok(ZH_RECIPES.some((recipe) => /荞麦|메밀/.test(`${recipe.title}${recipe.ingredients.map((i) => i.name).join()}`)));
    assert.ok(EN_RECIPES.some((recipe) => /buckwheat|soba/i.test(`${recipe.title}${recipe.ingredients.map((i) => i.name).join()}`)));
  });

  it("returns Chinese names for a Chinese UI, including 土豆 input", () => {
    const result = libraryRecipes(conditions({ ingredients: "土豆, 鸡蛋", locale: "zh" }));
    assert.ok(result.recipes.length > 0, "expected Chinese library hits");
    for (const recipe of result.recipes) {
      assert.equal(HANGUL.test(recipe.title), false, recipe.title);
      assert.equal(HANGUL.test(recipe.description), false, recipe.description);
    }
    assert.ok(result.recipes.some((recipe) => /土豆|鸡蛋|番茄|西红柿/.test(recipe.title + recipe.description)));
  });

  it("returns English names for an English UI, including potato input", () => {
    const result = libraryRecipes(conditions({ ingredients: "potato, chicken", locale: "en" }));
    assert.ok(result.recipes.length > 0, "expected English library hits");
    for (const recipe of result.recipes) {
      assert.equal(HANGUL.test(recipe.title), false, recipe.title);
      assert.match(recipe.title, /[A-Za-z]/);
    }
  });

  it("keeps Korean names on a Korean UI and does not swap in Chinese dishes", () => {
    const result = libraryRecipes(conditions({ ingredients: "감자, 달걀", locale: "ko" }));
    assert.ok(result.recipes.length > 0);
    for (const recipe of result.recipes) {
      assert.ok(HANGUL.test(recipe.title), recipe.title);
    }
    assert.equal(result.recipes.some((recipe) => recipe.title.includes("土豆") || recipe.title === "Anytime Pizza"), false);
  });

  it("does not fall back to Korean recipes on a Chinese UI when nothing matches", () => {
    const result = libraryRecipes(conditions({ ingredients: "험난한재료xyz", locale: "zh" }));
    assert.equal(result.recipes.length, 0);
    assert.equal(result.recipes.some((recipe) => HANGUL.test(recipe.title)), false);
  });

  it("filters 荞麦 and buckwheat when 메밀 is restricted, and does not pre-check 메밀", () => {
    assert.deepEqual(parseRestrictionSelection("").presets, []);
    assert.ok(RESTRICTION_PRESETS.includes("메밀"));

    const zh = finalizeRecipes(
      libraryRecipes(conditions({ ingredients: "荞麦面, 黄瓜", locale: "zh" })).recipes,
      conditions({ ingredients: "荞麦面, 黄瓜", restrictions: "메밀", locale: "zh" })
    );
    assert.equal(zh.recipes.some((recipe) => recipe.title.includes("荞麦")), false);

    const en = finalizeRecipes(
      libraryRecipes(conditions({ ingredients: "buckwheat flour, banana", locale: "en" })).recipes,
      conditions({ ingredients: "buckwheat flour, banana", restrictions: "메밀", locale: "en" })
    );
    assert.equal(en.recipes.some((recipe) => /buckwheat/i.test(recipe.title)), false);
  });

  it("reads locale from conditions and defaults older records to Korean", () => {
    assert.equal(localeOf({ locale: "zh" }), "zh");
    assert.equal(localeOf({}), "ko");
  });
});
