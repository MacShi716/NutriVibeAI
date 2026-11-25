import type { RestrictionPreset } from "@/lib/restrictions";
import { parseRestrictionSelection, RESTRICTION_PRESETS } from "@/lib/restrictions";
import { splitIngredients } from "@/lib/shopping";
import type { BmiBand } from "@/lib/profile";
import type { MealSlot } from "@/lib/types";
import { ko } from "./messages/ko";
import type { Messages } from "./messages/types";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const RESTRICTION_KEY: Record<RestrictionPreset, keyof Messages["restrictions"]> = {
  메밀: "buckwheat",
  땅콩: "peanut",
  우유: "milk",
  새우: "shrimp",
  달걀: "egg",
  밀: "wheat",
  대두: "soy",
};

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (token, key: string) => {
    const value = vars[key];
    return value === undefined ? token : String(value);
  });
}

export function weekdayLabel(t: Messages, index: number): string {
  const key = WEEKDAYS[index] ?? "sun";
  return t.weekdays[key];
}

export function slotLabel(t: Messages, slot: MealSlot): string {
  switch (slot) {
    case "breakfast":
      return t.slots.breakfast;
    case "lunch":
      return t.slots.lunch;
    case "dinner":
      return t.slots.dinner;
    default: {
      const never: never = slot;
      return never;
    }
  }
}

export function restrictionLabel(t: Messages, name: RestrictionPreset): string {
  const key = RESTRICTION_KEY[name];
  return t.restrictions[key];
}

/** Show preset names in the active language. Custom text stays as the user typed it. */
export function displayRestrictions(raw: string, t: Messages): string {
  return splitIngredients(raw)
    .map((token) => {
      const parsed = parseRestrictionSelection(token);
      if (parsed.presets.length === 1 && parsed.custom.length === 0) {
        return restrictionLabel(t, parsed.presets[0]);
      }
      return token;
    })
    .join(", ");
}

export function levelTitle(t: Messages, level: number): string {
  const key = `l${level}` as keyof Messages["levels"];
  return t.levels[key] ?? t.levels.l1;
}

export function achievementCopy(t: Messages, id: string): { title: string; desc: string } | null {
  if (Object.prototype.hasOwnProperty.call(t.achievements, id)) {
    return t.achievements[id as keyof Messages["achievements"]];
  }
  return null;
}

export function missionTitle(t: Messages, id: string): string | null {
  if (Object.prototype.hasOwnProperty.call(t.missions, id)) {
    return t.missions[id as keyof Messages["missions"]];
  }
  return null;
}

export function categoryLabel(t: Messages, key: string, fallback: string): string {
  if (Object.prototype.hasOwnProperty.call(t.shoppingCategories, key)) {
    return t.shoppingCategories[key as keyof Messages["shoppingCategories"]];
  }
  return fallback;
}

export function bmiLabel(t: Messages, band: BmiBand): string {
  switch (band) {
    case "under":
      return t.profile.bmiUnder;
    case "normal":
      return t.profile.bmiNormal;
    case "over":
      return t.profile.bmiOver;
    case "obese":
      return t.profile.bmiObese;
    default: {
      const never: never = band;
      return never;
    }
  }
}

export function activityLabel(
  t: Messages,
  level: "low" | "light" | "moderate" | "high" | "very_high"
): string {
  switch (level) {
    case "low":
      return t.profile.activityLow;
    case "light":
      return t.profile.activityLight;
    case "moderate":
      return t.profile.activityModerate;
    case "high":
      return t.profile.activityHigh;
    case "very_high":
      return t.profile.activityVeryHigh;
    default: {
      const never: never = level;
      return never;
    }
  }
}

function exactFrom(group: Record<string, string>, text: string, translated: Record<string, string>): string | null {
  for (const key of Object.keys(group)) {
    if (group[key] === text) return translated[key] ?? text;
  }
  return null;
}

/** Translate known engine/API sentences. Unknown recipe text is left unchanged. */
export function localizeMessage(text: string, t: Messages): string {
  const exactError = exactFrom(ko.errors, text, t.errors);
  if (exactError) return exactError;
  const exactNotice = exactFrom(ko.notices, text, t.notices);
  if (exactNotice) return exactNotice;

  const excluded = text.match(/^(.+): 제한 재료\((.+)\)가 포함되어 제외되었습니다\.$/);
  if (excluded) {
    return format(t.notices.restrictionExcluded, { title: excluded[1], names: excluded[2] });
  }
  const high = text.match(
    /^목표 열량\((\d+) kcal\) 대비 높은 레시피가 있습니다: (.+)\. 참고용 안내이며 필요 시 다른 레시피를 선택하세요\.$/
  );
  if (high) {
    return format(t.notices.highCalorie, { goal: high[1], list: high[2] });
  }
  const uncovered = text.match(
    /^입력한 식재료 중 일부\((.+)\)를 사용하는 레시피가 내장 라이브러리에 없어 추천에 반영되지 않았습니다\. 다른 재료와 함께 시도해 주세요\.$/
  );
  if (uncovered) {
    return format(t.notices.uncovered, { names: uncovered[1] });
  }
  return text;
}

export function presetOrder(): readonly RestrictionPreset[] {
  return RESTRICTION_PRESETS;
}
