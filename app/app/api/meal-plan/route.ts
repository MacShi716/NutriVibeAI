import { NextRequest, NextResponse } from "next/server";
import { parseConditions } from "@/lib/conditions";
import { isIsoDate } from "@/lib/dates";
import { createWeeklyPlan, swapWeeklyMeal, type PinnedMeal } from "@/lib/mealplan";
import type { MealSlot, Recipe } from "@/lib/types";

export const runtime = "nodejs";

function isSlot(value: unknown): value is MealSlot {
  return value === "breakfast" || value === "lunch" || value === "dinner";
}

function readPinned(value: unknown): PinnedMeal[] {
  if (!Array.isArray(value)) return [];
  const pinned: PinnedMeal[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as { date?: unknown; slot?: unknown; recipe?: unknown };
    if (typeof row.date !== "string" || !isIsoDate(row.date) || !isSlot(row.slot)) continue;
    const recipe = row.recipe as Recipe | null;
    if (!recipe || typeof recipe.title !== "string" || !Array.isArray(recipe.ingredients)) continue;
    pinned.push({ date: row.date, slot: row.slot, recipe });
  }
  return pinned;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문을 파싱할 수 없습니다." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const action = record.action === "swap" ? "swap" : record.action === "generate" ? "generate" : null;
  if (!action) {
    return NextResponse.json({ error: "요청 종류를 확인해 주세요." }, { status: 400 });
  }

  const nested =
    typeof record.conditions === "object" && record.conditions !== null
      ? (record.conditions as Record<string, unknown>)
      : record;
  const check = parseConditions({ ...nested, expiringIngredients: record.expiringIngredients ?? nested.expiringIngredients });
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }
  if (!check.data.ingredients.trim()) {
    return NextResponse.json({ error: "보유 식재료를 입력한 뒤 주간 식단을 만들어 주세요." }, { status: 400 });
  }

  try {
    if (action === "swap") {
      if (!isSlot(record.slot)) {
        return NextResponse.json({ error: "교체할 끼니를 확인해 주세요." }, { status: 400 });
      }
      const avoidTitles = Array.isArray(record.avoidTitles)
        ? record.avoidTitles.filter((item): item is string => typeof item === "string").slice(0, 40)
        : [];
      const swapped = await swapWeeklyMeal({
        conditions: check.data,
        expiringIngredients: check.expiringIngredients,
        slot: record.slot,
        avoidTitles,
      });
      if (!swapped.recipe) {
        return NextResponse.json({ error: "다른 레시피를 찾지 못했습니다." }, { status: 404 });
      }
      return NextResponse.json(swapped);
    }

    const startDate = typeof record.startDate === "string" ? record.startDate : "";
    if (!isIsoDate(startDate)) {
      return NextResponse.json({ error: "시작 날짜가 올바르지 않습니다." }, { status: 400 });
    }
    const plan = await createWeeklyPlan({
      conditions: check.data,
      expiringIngredients: check.expiringIngredients,
      startDate,
      pinned: readPinned(record.pinned),
    });
    return NextResponse.json({ plan });
  } catch (err) {
    console.error("[nutrivibe] 주간 식단 실패:", err);
    return NextResponse.json(
      { error: "주간 식단을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
