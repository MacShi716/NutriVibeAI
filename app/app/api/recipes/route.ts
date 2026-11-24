import { NextRequest, NextResponse } from "next/server";
import { parseConditions } from "@/lib/conditions";
import { generateRecipes } from "@/lib/gemini";
import { orderIngredientsForGeneration } from "@/lib/pantry";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문을 파싱할 수 없습니다." }, { status: 400 });
  }

  const check = parseConditions(body);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const generation = orderIngredientsForGeneration(check.data, check.expiringIngredients);

  try {
    const { recipes, warnings, usedMock, provider } = await generateRecipes(generation);
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
