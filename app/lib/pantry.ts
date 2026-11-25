import { translateToKorean } from "./alias";
import { addDays, todayKey } from "./dates";
import { splitIngredients } from "./shopping";
import type { PantryItem, UserConditions } from "./types";

export type ExpiryState = "none" | "ok" | "soon" | "expired";

const SOON_DAYS = 3;

export const PANTRY_EVENT = "nutrivibe:pantry";

function compact(name: string): string {
  return translateToKorean(name).replace(/\s+/g, "").toLowerCase();
}

export function expiryState(expiresOn: string | null, today = todayKey()): ExpiryState {
  if (!expiresOn) return "none";
  if (expiresOn < today) return "expired";
  if (expiresOn <= addDays(today, SOON_DAYS)) return "soon";
  return "ok";
}

export function expiryLabel(state: ExpiryState): string {
  switch (state) {
    case "none":
      return "";
    case "ok":
      return "여유";
    case "soon":
      return "임박";
    case "expired":
      return "지남";
    default: {
      const never: never = state;
      return never;
    }
  }
}

/** 유통기한이 지났거나 3일 이내인 재료. 날짜가 빠른 순. */
export function listExpiringNames(items: PantryItem[], today = todayKey()): string[] {
  return items
    .filter((item) => {
      const state = expiryState(item.expiresOn, today);
      return state === "soon" || state === "expired";
    })
    .sort((a, b) => (a.expiresOn ?? "").localeCompare(b.expiresOn ?? ""))
    .map((item) => item.name);
}

/**
 * 우선 추천이 켜져 있을 때만 유통기한 임박 재료를 앞으로 보낸다.
 * mock.ts의 매칭 규칙은 바꾸지 않고, 기존 규칙이 이미 보는 입력 순서만 조정한다.
 */
export function orderIngredientsForGeneration(
  conditions: UserConditions,
  expiring: string[]
): UserConditions {
  if (!conditions.prioritizeExpiring || expiring.length === 0) return conditions;
  const parts = splitIngredients(conditions.ingredients);
  const rank = (name: string) => {
    const key = compact(name);
    const idx = expiring.findIndex((item) => {
      const other = compact(item);
      return key.length > 0 && other.length > 0 && (key.includes(other) || other.includes(key));
    });
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };
  const ordered = [...parts].sort((a, b) => rank(a) - rank(b));
  return { ...conditions, ingredients: ordered.join(", ") };
}

/** 쇼핑 항목과 이름이 겹치는 보유 재료가 임박하거나 지났으면 그 상태를 돌려준다. */
export function ingredientExpiryMark(
  name: string,
  items: PantryItem[],
  today = todayKey()
): "soon" | "expired" | null {
  const key = compact(name);
  if (!key) return null;
  let soon = false;
  for (const item of items) {
    const other = compact(item.name);
    if (!other || (key !== other && !key.includes(other) && !other.includes(key))) continue;
    const state = expiryState(item.expiresOn, today);
    if (state === "expired") return "expired";
    if (state === "soon") soon = true;
  }
  return soon ? "soon" : null;
}

/** 입력란의 재료 목록과 저장된 날짜를 맞춘다. 같은 재료의 날짜는 유지한다. */
export function syncPantry(names: string[], prev: PantryItem[]): PantryItem[] {
  return names.map((name) => {
    const key = compact(name);
    const found = prev.find((item) => compact(item.name) === key);
    return {
      name,
      purchasedOn: found?.purchasedOn ?? null,
      expiresOn: found?.expiresOn ?? null,
    };
  });
}
