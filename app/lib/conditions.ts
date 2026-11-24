import { isValidServings, SERVINGS_ERROR } from "./limits";
import type { UserConditions } from "./types";

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalGoal(
  raw: unknown,
  min: number,
  max: number,
  error: string
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return { ok: false, error };
  return { ok: true, value: Math.round(n) };
}

export function parseConditions(
  body: unknown
): { ok: true; data: UserConditions; expiringIngredients: string[] } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "잘못된 요청 본문입니다." };
  }
  const record = body as Record<string, unknown>;
  const servings = Number(record.servings ?? 0);
  const cookMinutes = Number(record.cookMinutes ?? 0);
  if (!isValidServings(servings)) return { ok: false, error: SERVINGS_ERROR };
  if (!Number.isFinite(cookMinutes) || cookMinutes < 5 || cookMinutes > 180) {
    return { ok: false, error: "조리 시간은 5~180분 사이여야 합니다." };
  }
  const calories = optionalGoal(record.goalCalories, 500, 8000, "목표 열량은 500~8000 kcal 사이여야 합니다.");
  if (!calories.ok) return calories;
  const protein = optionalGoal(record.goalProtein, 1, 400, "단백질 목표는 1~400g 사이여야 합니다.");
  if (!protein.ok) return protein;

  const expiringRaw = record.expiringIngredients;
  const expiringIngredients = Array.isArray(expiringRaw)
    ? expiringRaw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && item.length <= 40)
        .slice(0, 40)
    : [];

  return {
    ok: true,
    expiringIngredients,
    data: {
      ingredients: str(record.ingredients),
      preferences: str(record.preferences),
      restrictions: str(record.restrictions),
      servings,
      cookMinutes,
      goalCalories: calories.value,
      goalProtein: protein.value,
      prioritizeExpiring: record.prioritizeExpiring === true,
    },
  };
}
