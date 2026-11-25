import { NextRequest, NextResponse } from "next/server";
import { translateToKorean } from "@/lib/alias";
import { demoVisionIngredients } from "@/lib/vision-demo";

export const runtime = "nodejs";

/** 업로드 이미지는 메모리에서만 처리하고 저장하지 않는다. */
const MAX_BYTES = 4 * 1024 * 1024;
const DEFAULT_GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const PROMPT =
  "이 사진에 보이는 식재료만 한국어 일반 명칭으로 나열하세요. " +
  '반드시 {"ingredients":["재료명"]} 형식의 JSON만 출력하고, 식재료가 없으면 {"ingredients":[]}를 출력하세요.';

type VisionCall = { kind: "openai"; url: string; key: string; model: string } | { kind: "gemini"; key: string; model: string };

/** Groq(OpenAI 호환)를 기본으로 하고, 없으면 Gemini, 둘 다 없으면 데모 모드. */
function visionConfig(): VisionCall | null {
  const base = (process.env.VISION_API_BASE ?? "").trim().replace(/\/+$/, "");
  const key = (process.env.VISION_API_KEY ?? "").trim();
  const model = (process.env.VISION_MODEL ?? "").trim();
  if (base && key && model) return { kind: "openai", url: `${base}/chat/completions`, key, model };
  const groq = (process.env.GROQ_API_KEY ?? "").trim();
  if (groq) {
    return {
      kind: "openai",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: groq,
      model: model || DEFAULT_GROQ_VISION_MODEL,
    };
  }
  const gemini = (process.env.GEMINI_API_KEY ?? "").trim();
  if (gemini) return { kind: "gemini", key: gemini, model: (process.env.GEMINI_MODEL ?? "").trim() || "gemini-3.8-flash" };
  return null;
}

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

async function recognize(cfg: VisionCall, file: File): Promise<string[]> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  if (cfg.kind === "openai") {
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
              { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`vision (${res.status})`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return parseList(json.choices?.[0]?.message?.content ?? "");
  }
  if (cfg.kind === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: file.type, data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) throw new Error(`vision (${res.status})`);
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
    return parseList(text);
  }
  const never: never = cfg;
  return never;
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

  const cfg = visionConfig();
  if (!cfg) {
    return NextResponse.json({ ingredients: demoVisionIngredients(restrictions), demo: true });
  }

  try {
    const ingredients = await recognize(cfg, file);
    return NextResponse.json({ ingredients, demo: false });
  } catch (err) {
    console.error("[nutrivibe] 사진 인식 실패", err instanceof Error ? err.message : "");
    return NextResponse.json(
      { error: "사진 인식에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 }
    );
  }
}
