import { NextRequest, NextResponse } from "next/server";
import { translateToKorean } from "@/lib/alias";

export const runtime = "nodejs";

/** 업로드 이미지 최대 크기 (서버 기준). 이미지는 메모리에서만 처리하고 저장하지 않는다. */
const MAX_BYTES = 4 * 1024 * 1024;
const DEFAULT_GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const DEMO_LIST = ["달걀", "양파", "대파", "두부", "감자", "당근", "우유"];

const PROMPT =
  "이 사진에 보이는 식재료만 한국어 일반 명칭(예: 달걀, 양파, 두부)으로 나열하세요. " +
  '반드시 {"ingredients":["재료명"]} 형식의 JSON만 출력하고, 식재료가 없으면 {"ingredients":[]}를 출력하세요.';

/** OpenAI 호환 chat/completions 설정: VISION_* 우선, 없으면 GROQ_API_KEY로 Groq 비전 모델 사용 */
function visionConfig(): { url: string; key: string; model: string } | null {
  const base = (process.env.VISION_API_BASE ?? "").trim().replace(/\/+$/, "");
  const key = (process.env.VISION_API_KEY ?? "").trim();
  const model = (process.env.VISION_MODEL ?? "").trim();
  if (base && key && model) return { url: `${base}/chat/completions`, key, model };
  const groq = (process.env.GROQ_API_KEY ?? "").trim();
  if (groq) {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: groq,
      model: model || DEFAULT_GROQ_VISION_MODEL,
    };
  }
  return null;
}

function parseList(text: string): string[] {
  const m = text.match(/\{[\s\S]*\}/);
  const data = JSON.parse(m ? m[0] : text) as { ingredients?: unknown };
  if (!Array.isArray(data.ingredients)) return [];
  const names = data.ingredients
    .filter((x): x is string => typeof x === "string")
    .map((x) => translateToKorean(x.trim()))
    .filter((x) => x.length > 0 && x.length <= 20);
  return Array.from(new Set(names)).slice(0, 20);
}

export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("image");
    file = f instanceof File ? f : null;
  } catch {
    file = null;
  }
  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일을 선택해 주십시오." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "이미지 용량은 4MB 이하만 업로드할 수 있습니다." },
      { status: 413 }
    );
  }

  const cfg = visionConfig();
  if (!cfg) {
    return NextResponse.json({ ingredients: DEMO_LIST, demo: true });
  }

  const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`vision (${res.status})`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const ingredients = parseList(json.choices?.[0]?.message?.content ?? "");
    return NextResponse.json({ ingredients, demo: false });
  } catch (err) {
    console.error("[nutrivibe] 사진 인식 실패", err instanceof Error ? err.message : "");
    return NextResponse.json(
      { error: "사진 인식에 실패했습니다. 잠시 후 다시 시도해 주십시오." },
      { status: 502 }
    );
  }
}
