import { translateToKorean } from "./alias";
import { splitIngredients } from "./shopping";

/** 비전 API 키가 없거나 정적 호스트에서 API를 호출할 수 없을 때 보여주는 예시 식재료. */
export const VISION_DEMO_INGREDIENTS: readonly string[] = [
  "달걀",
  "양파",
  "대파",
  "두부",
  "감자",
  "당근",
  "우유",
];

function compact(value: string): string {
  return translateToKorean(value).replace(/\s+/g, "").toLowerCase();
}

/** 레시피 필터와 같이, 이름과 제한 항목이 서로 포함되면 같은 재료로 본다. */
export function ingredientMatchesRestriction(name: string, restrictions: string): boolean {
  const item = compact(name);
  if (!item) return false;
  return splitIngredients(restrictions).some((raw) => {
    const banned = compact(raw);
    return banned.length > 0 && (item.includes(banned) || banned.includes(item));
  });
}

/** 데모 목록에서 현재 기피·알레르기와 겹치는 항목을 뺀다. */
export function demoVisionIngredients(restrictions: string): string[] {
  return VISION_DEMO_INGREDIENTS.filter((name) => !ingredientMatchesRestriction(name, restrictions));
}
