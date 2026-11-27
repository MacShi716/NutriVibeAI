import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import { DishVisualView } from "../components/DishVisual";
import { CATALOG } from "../i18n/catalog";
import {
  DISH_CATEGORIES,
  dishAriaLabel,
  dishCategoryLabel,
  inferDishCategory,
  keyIngredientFacts,
  portionFacts,
  vesselForDish,
  type DishCategory,
  type DishVessel,
} from "./dish-visual";
import type { Recipe } from "./types";

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: "test-1",
    title: "김치찌개",
    description: "",
    ingredients: [
      { name: "돼지고기", amount: "200g" },
      { name: "김치", amount: "300g" },
      { name: "두부", amount: "1/2모" },
    ],
    steps: ["끓인다"],
    cookMinutes: 25,
    servings: 2,
    nutrition: { calories: 420, protein: 24, carbs: 18, fat: 22 },
    ...overrides,
  };
}

describe("dish category inference", () => {
  it("recognizes the major Korean dish families", () => {
    const cases: [string, DishCategory, DishVessel][] = [
      ["김치찌개", "soup", "bowl"],
      ["불고기", "grill", "plate"],
      ["연어 샐러드", "salad", "bowl"],
      ["계란말이", "egg", "plate"],
      ["알리오 올리오 파스타", "noodles", "bowl"],
      ["김밥", "rice", "plate"],
      ["두부조림", "tofu", "plate"],
      ["김치전", "pancake", "plate"],
      ["떡볶이", "riceCake", "bowl"],
      ["브로콜리 무침", "vegetable", "plate"],
      ["고등어 구이", "seafood", "plate"],
      ["바나나 우유", "dessert", "bowl"],
    ];
    for (const [title, category, vessel] of cases) {
      assert.equal(inferDishCategory({ title, ingredients: [] }), category, title);
      assert.equal(vesselForDish(category, title), vessel, title);
    }
  });

  it("recognizes common English and Chinese dish names", () => {
    assert.equal(inferDishCategory({ title: "2-Step Chicken", ingredients: [] }), "grill");
    assert.equal(inferDishCategory({ title: "3-Can Chili", ingredients: [] }), "soup");
    assert.equal(inferDishCategory({ title: "Breakfast Banana Split", ingredients: [] }), "dessert");
    assert.equal(inferDishCategory({ title: "Corn Pancakes", ingredients: [] }), "pancake");
    assert.equal(inferDishCategory({ title: "西红柿炒鸡蛋", ingredients: [] }), "egg");
    assert.equal(inferDishCategory({ title: "酸辣土豆丝", ingredients: [] }), "vegetable");
  });

  it("uses ingredients only when the title has no category", () => {
    assert.equal(
      inferDishCategory({
        title: "Chef's special",
        ingredients: [{ name: "rice", amount: "2 cups" }],
      }),
      "rice"
    );
    assert.equal(
      inferDishCategory({
        title: "Chef's special",
        ingredients: [{ name: "두부", amount: "1모" }],
      }),
      "tofu"
    );
    assert.equal(
      inferDishCategory({
        title: "Chef's special",
        ingredients: [{ name: "bulgur (dry)", amount: "1 cup" }],
      }),
      "rice"
    );
  });

  it("lets the title win over an ingredient word from another category", () => {
    assert.equal(
      inferDishCategory({
        title: "2-Step Chicken",
        ingredients: [{ name: "cream of chicken soup", amount: "1 can" }],
      }),
      "grill"
    );
  });

  it("does not treat 탕수육 as soup", () => {
    assert.equal(inferDishCategory({ title: "탕수육", ingredients: [] }), "grill");
  });

  it("has a localized label for every category", () => {
    for (const locale of ["ko", "en", "zh"] as const) {
      for (const category of DISH_CATEGORIES) {
        assert.equal(typeof CATALOG[locale].dish.categories[category], "string");
        assert.ok(CATALOG[locale].dish.categories[category].trim().length > 0);
      }
    }
  });
});

describe("dish portion facts", () => {
  it("uses the recipe's own servings and cook time", () => {
    const facts = portionFacts({ servings: 2, cookMinutes: 20 });
    assert.equal(facts.servings, 2);
    assert.equal(facts.cookMinutes, 20);
    assert.equal(facts.tier, "standard");
    assert.ok(facts.scale >= 0.84 && facts.scale <= 1.16);
  });

  it("marks single and family portions without inventing values", () => {
    assert.equal(portionFacts({ servings: 1, cookMinutes: 5 }).tier, "single");
    assert.equal(portionFacts({ servings: 6, cookMinutes: 40 }).tier, "family");
    assert.ok(portionFacts({ servings: 6, cookMinutes: 40 }).scale > portionFacts({ servings: 1, cookMinutes: 5 }).scale);
  });

  it("does not turn missing values into made-up numbers", () => {
    const facts = portionFacts({ servings: 0, cookMinutes: 0 });
    assert.equal(facts.servings, 1);
    assert.equal(facts.cookMinutes, null);
  });

  it("copies existing ingredient amounts verbatim and skips empty amounts", () => {
    const rows = keyIngredientFacts(
      {
        ingredients: [
          { name: "식용유", amount: "1큰술" },
          { name: "소고기", amount: "400g" },
          { name: "양파", amount: "1/2개" },
          { name: "소금", amount: "" },
        ],
      },
      2
    );
    assert.deepEqual(rows, [
      { name: "소고기", amount: "400g" },
      { name: "양파", amount: "1/2개" },
    ]);
    assert.equal(keyIngredientFacts({ ingredients: [] }, 2).length, 0);
    assert.equal(keyIngredientFacts({ ingredients: [{ name: "소고기", amount: "400g" }] }, 0).length, 0);
  });

  it("prefers a recognizable main ingredient over oil in an English recipe", () => {
    const rows = keyIngredientFacts(
      {
        ingredients: [
          { name: "vegetable oil", amount: "1 tablespoon" },
          { name: "Boneless chicken breasts", amount: "2" },
          { name: "cream of chicken soup (10 ounces)", amount: "1 can" },
        ],
      },
      2
    );
    assert.deepEqual(rows, [
      { name: "Boneless chicken breasts", amount: "2" },
      { name: "cream of chicken soup (10 ounces)", amount: "1 can" },
    ]);
  });
});

describe("dish visual localization", () => {
  it("localizes the accessible description and category", () => {
    const dish = recipe();
    const ko = dishAriaLabel(dish, CATALOG.ko);
    assert.match(ko, /김치찌개/);
    assert.match(ko, /국·탕·찌개/);
    assert.match(ko, /2인분 기준/);
    assert.match(ko, /조리 25분/);
    assert.match(ko, /참고 일러스트/);
    assert.match(ko, /정확한 양을 나타내지 않습니다/);

    const en = dishAriaLabel(dish, CATALOG.en);
    assert.match(en, /Soups & stews/);
    assert.match(en, /based on 2 servings/i);
    assert.match(en, /25 min cook time/);
    assert.match(en, /reference illustration/);

    const zh = dishAriaLabel(dish, CATALOG.zh);
    assert.match(zh, /汤·锅物/);
    assert.match(zh, /按 2 人份/);
    assert.match(zh, /参考插图/);
  });

  it("renders category, real amounts, and the illustration disclaimer", () => {
    const html = renderToStaticMarkup(
      createElement(DishVisualView, { recipe: recipe(), messages: CATALOG.ko, variant: "card" })
    );
    assert.match(html, /data-dish-visual/);
    assert.match(html, /data-category="soup"/);
    assert.match(html, /data-vessel="bowl"/);
    assert.match(html, /data-servings="2"/);
    assert.match(html, /data-cook-minutes="25"/);
    assert.match(html, /국·탕·찌개/);
    assert.match(html, /2인분 기준/);
    assert.match(html, /돼지고기 200g/);
    assert.match(html, /김치 300g/);
    assert.match(html, /정확한 양을 나타내지 않습니다/);
    assert.equal(html.includes("420 kcal"), false);
  });

  it("renders localized captions for English and Chinese", () => {
    const en = renderToStaticMarkup(
      createElement(DishVisualView, { recipe: recipe(), messages: CATALOG.en })
    );
    assert.match(en, /based on 2 servings/i);
    assert.match(en, /Soups &amp; stews/);
    assert.match(en, /not a measured portion/);

    const zh = renderToStaticMarkup(
      createElement(DishVisualView, { recipe: recipe(), messages: CATALOG.zh })
    );
    assert.match(zh, /按 2 人份/);
    assert.match(zh, /汤·锅物/);
    assert.match(zh, /不代表精确份量/);
  });

  it("keeps the Korean category names free of Chinese characters", () => {
    for (const category of DISH_CATEGORIES) {
      assert.equal(/[\u3400-\u9fff]/.test(dishCategoryLabel(CATALOG.ko, category)), false, category);
    }
  });
});
