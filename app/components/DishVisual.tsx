"use client";

import React from "react";
import { format } from "@/i18n/text";
import type { Messages } from "@/i18n/messages/types";
import type { Recipe } from "@/lib/types";
import {
  dishAriaLabel,
  dishCategoryLabel,
  inferDishCategory,
  keyIngredientFacts,
  portionFacts,
  vesselForDish,
} from "@/lib/dish-visual";
import { useUi } from "./UiProvider";

type DishRecipe = Pick<Recipe, "title" | "ingredients" | "servings" | "cookMinutes">;

export type DishVisualProps = {
  recipe: DishRecipe;
  variant?: "card" | "compact" | "hero";
  className?: string;
};

const SHAPES = [1, 2, 3, 4, 5] as const;

/**
 * A procedural plate or bowl built from local CSS shapes. There is no canvas,
 * WebGL, image CDN, or third-party 3D library. The drawing is decorative; the
 * caption prints the recipe's own servings, cook time, and ingredient amounts.
 */
export function DishVisualView({
  recipe,
  messages,
  variant = "card",
  className = "",
}: DishVisualProps & { messages: Messages }) {
  const category = inferDishCategory(recipe);
  const vessel = vesselForDish(category, recipe.title);
  const portion = portionFacts(recipe);
  const ingredients = keyIngredientFacts(recipe, variant === "hero" ? 3 : 2);
  const label = dishAriaLabel(recipe, messages);
  const style = { "--nv-dish-scale": String(portion.scale) } as React.CSSProperties;

  return (
    <figure
      className={`nv-dish nv-dish--${variant} nv-dish--${vessel} ${className}`.trim()}
      data-dish-visual=""
      data-category={category}
      data-vessel={vessel}
      data-servings={portion.servings}
      data-cook-minutes={portion.cookMinutes ?? undefined}
      data-portion-tier={portion.tier}
      style={style}
    >
      <div className="nv-dish__scene" role="img" aria-label={label}>
        <span className="nv-dish__shadow" aria-hidden="true" />
        <div className="nv-dish__vessel" aria-hidden="true">
          <span className="nv-dish__rim" />
          <span className="nv-dish__well" />
          <span className="nv-dish__food">
            <span className="nv-dish__base" />
            {SHAPES.map((shape) => (
              <span key={shape} className={`nv-dish__shape nv-dish__shape--${shape}`} />
            ))}
          </span>
          <span className="nv-dish__gloss" />
        </div>
      </div>
      <figcaption className="nv-dish__caption">
        <span className="nv-dish__tags">
          <span className="nv-dish__tag">{dishCategoryLabel(messages, category)}</span>
          <span className="nv-dish__fact">
            {format(messages.dish.servingBasis, { n: portion.servings })}
          </span>
          {portion.cookMinutes !== null ? (
            <span className="nv-dish__fact">
              {format(messages.dish.minutes, { n: portion.cookMinutes })}
            </span>
          ) : null}
        </span>
        {ingredients.length > 0 ? (
          <span className="nv-dish__ingredients">
            {format(messages.dish.keyIngredients, {
              list: ingredients
                .map((item) => format(messages.dish.ingredient, { name: item.name, amount: item.amount }))
                .join(" · "),
            })}
          </span>
        ) : null}
        <span className="nv-dish__note">{messages.dish.illustrationNote}</span>
      </figcaption>
    </figure>
  );
}

export default function DishVisual(props: DishVisualProps) {
  const { t } = useUi();
  return <DishVisualView {...props} messages={t} />;
}
