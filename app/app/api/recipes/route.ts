import { NextRequest, NextResponse } from "next/server";
import { generateRecipes } from "@/lib/gemini";
import type { UserConditions } from "@/lib/types";
import { isValidServings, SERVINGS_ERROR } from "@/lib/limits";

export const runtime = "nodejs";

function validateConditions(body: unknown): { ok: true; data: UserConditions } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "잘못된 요청 본문입니다." };
  }
  const b = body as Record<string, unknown>;
  const servings = Number(b.servings ?? 0);
  const cookMinutes = Number(b.cookMinutes ?? 0);
  if (!isValidServings(servings)) {
    return { ok: false, error: SERVINGS_ERROR };
  }
  if (!Number.isFinite(cookMinutes) || cookMinutes < 5 || cookMinutes > 180) {
    return { ok: false, error: "조리 시간은 5~180분 사이여야 합니다." };
  }
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const goalCaloriesRaw = b.goalCalories;
  let goalCalories: number | null = null;
  if (
    goalCaloriesRaw !== undefined &&
    goalCaloriesRaw !== null &&
    goalCaloriesRaw !== ""
  ) {
    const g = Number(goalCaloriesRaw);
    if (!Number.isFinite(g) || g < 500 || g > 8000) {
      return { ok: false, error: "목표 열량은 500~8000 kcal 사이여야 합니다." };
    }
    goalCalories = Math.round(g);
  }
  return {
    ok: true,
    data: {
      ingredients: str(b.ingredients),
      preferences: str(b.preferences),
      restrictions: str(b.restrictions),
      servings,
      cookMinutes,
      goalCalories,
    },
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문을 파싱할 수 없습니다." }, { status: 400 });
  }

  const check = validateConditions(body);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  try {
    const { recipes, warnings, usedMock, provider } = await generateRecipes(check.data);
    return NextResponse.json({
      conditions: check.data,
      recipes,
      warnings,
      usedMock,
      provider,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[nutrivibe] 레시피 생성 실패:", err);
    return NextResponse.json(
      { error: "레시피 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
