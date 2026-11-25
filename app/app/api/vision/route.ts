import { NextRequest, NextResponse } from "next/server";
import { translateToKorean } from "@/lib/alias";
import { demoVisionIngredients } from "@/lib/vision-demo";

export const runtime = "nodejs";

/** 업로드 이미지는 메모리에서만 처리하고 저장하지 않는다. */
const MAX_BYTES = 4 * 1024 * 1024;
const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const VISION_MODEL = "glm-4v-flash";
const SYSTEM =
  "당신은 NutriVibe의 식재료 인식 도우미입니다. " +
  "사진에 실제로 보이는 식재료만 한국어 일반 명칭으로 식별하십시오. " +
  "의학적 진단이나 식품 안전 판정을 하지 마십시오. " +
  "사용자가 기피 또는 알레르기로 명시한 재료는 목록에 넣지 마십시오. " +
  "명시되지 않은 알레르기를 임의로 적용하지 마십시오. " +
  '반드시 {"ingredients":["재료명"]} 형식의 JSON만 출력하십시오. ' +
  '식재료가 없으면 {"ingredients":[]}를 출력하십시오.';

function parseList(text: string): string[] {
  const matched = text.match(/\{[\s\S]*\}/);
  const data = JSON.parse(matched ? matched[0] : text) as { ingredients?: unknown };
  if (!Array.isArray(data.ingredients)) return [];
  const names = data.ingredients
    .filter((item): item is string => typeof item === "string")
    .map((item) => translateToKorean(item.trim()))
    .filter((item) => item.length > 0 && item.length <= 20);
  return Array.from(new Set(names)).slice(0, 20);
}

async function recognize(apiKey: string, file: File, restrictions: string): Promise<string[]> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const mime = file.type === "image/jpg" ? "image/jpeg" : file.type;
  let prompt = "이 사진에 보이는 식재료만 한국어 일반 명칭으로 나열하십시오.";
  if (restrictions.trim()) {
    prompt += ` 다음 기피 및 알레르기 재료는 목록에 넣지 마십시오: ${restrictions.trim().slice(0, 500)}.`;
  }
  const res = await fetch(ZHIPU_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    await res.text().catch(() => "");
    throw new Error(`vision (${res.status})`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string | Array<{ text?: string }> } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  const text = Array.isArray(content)
    ? content.map((part) => (typeof part?.text === "string" ? part.text : "")).join("\n")
    : content ?? "";
  return parseList(text);
}

export async function POST(req: NextRequest) {
  let file: File | null = null;
  let restrictions = "";
  try {
    const form = await req.formData();
    const uploaded = form.get("image");
    file = uploaded instanceof File ? uploaded : null;
    const rawRestrictions = form.get("restrictions");
    restrictions = typeof rawRestrictions === "string" ? rawRestrictions : "";
  } catch {
    file = null;
  }
  if (!file || !file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return NextResponse.json({ error: "이미지 파일을 선택해 주세요." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "이미지 용량은 4MB 이하만 업로드할 수 있습니다." }, { status: 413 });
  }

  const key = (process.env.ZHIPU_API_KEY ?? "").trim();
  if (!key) {
    return NextResponse.json({ ingredients: demoVisionIngredients(restrictions), demo: true });
  }

  try {
    const ingredients = await recognize(key, file, restrictions);
    return NextResponse.json({ ingredients, demo: false, provider: "zhipu" });
  } catch (err) {
    console.error("[nutrivibe] 사진 인식 실패", err instanceof Error ? err.message : "");
    return NextResponse.json(
      { error: "사진 인식에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 }
    );
  }
}
