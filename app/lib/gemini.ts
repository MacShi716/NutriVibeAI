import type { Recipe, UserConditions } from "./types";
import { splitIngredients } from "./shopping";
import { estimateNutrition } from "./nutrition";
import { translateToKorean } from "./alias";
import { mockRecipes } from "./mock";

// ============================================================ 프롬프트

export function buildPrompt(c: UserConditions): string {
  const goalLine =
    c.goalCalories && c.goalCalories > 0
      ? `- 목표 일일 열량: ${c.goalCalories} kcal (이 끼니는 하루 권장 열량의 약 30% 수준으로 조정)`
      : "";
  return [
    "당신은 가정식 레시피 전문가입니다. 아래 조건을 바탕으로 2~3개의 레시피를 JSON 형식으로 생성하세요.",
    `- 보유 식재료: ${c.ingredients || "없음"}`,
    `- 식사 인원: ${c.servings}명`,
    `- 조리 시간: ${c.cookMinutes}분 이내`,
    goalLine,
    `- 식습관 및 선호: ${c.preferences || "제한 없음"}`,
    `- 기피 및 알레르기: ${c.restrictions || "없음"}`,
    "- 보유 식재료를 최우선으로 활용할 것",
    "- 제한 식재료는 어떤 경우에도 사용하지 말 것",
    "- 결과는 반드시 아래 JSON 형식으로만 출력하고, JSON 외의 설명은 출력하지 말 것",
    "- 최상위는 반드시 \"recipes\" 배열을 가진 JSON 객체여야 하며(배열 단독 출력 금지), 마크다운 코드 블록 없이 JSON만 출력할 것",
    '{"recipes":[{"title":"레시피명","description":"한 줄 설명","ingredients":[{"name":"재료명","amount":"수량(예: 200g)"}],"steps":["조리 단계 1","조리 단계 2"],"cookMinutes":조리시간,"servings":인원,"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}]}',
    "- 재료명은 괄호 없이 일반적인 명칭(예: 소고기, 달걀, 두부)으로, 수량은 g, ml, 개, 큰술, 작은술 단위로 적을 것",
    "- 식재료로 볼 수 없는 입력은 사용하지 말고, 사용할 수 있는 식재료가 전혀 없으면 {\"recipes\":[]} 만 출력할 것",
    "- 영양 수치는 추정치이며 참고용으로만 기재할 것",
    "- 의료적 조언을 제공하지 말 것",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// ============================================================ JSON 파싱/검증

function cleanJsonText(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  // 객체({...}) 또는 배열([...]) 어느 쪽이든 첫 여는 괄호 ~ 마지막 닫는 괄호까지 추출
  const braceStart = t.indexOf("{");
  const bracketStart = t.indexOf("[");
  const starts = [braceStart, bracketStart].filter((i) => i >= 0);
  const start = starts.length > 0 ? Math.min(...starts) : -1;
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (start >= 0 && end > start) {
    t = t.slice(start, end + 1);
  }
  return t;
}

function isRecipeLike(x: unknown): x is Recipe {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.title === "string" &&
    typeof r.description === "string" &&
    Array.isArray(r.ingredients) &&
    Array.isArray(r.steps) &&
    typeof r.cookMinutes === "number" &&
    typeof r.servings === "number"
  );
}

export function parseRecipes(jsonText: string): Recipe[] {
  const data = JSON.parse(cleanJsonText(jsonText)) as unknown;
  // {"recipes":[...]}, 최상위 배열 [...], 단일 레시피 객체 {...} 를 모두 허용한다
  let list: unknown[];
  if (Array.isArray(data)) {
    list = data;
  } else if (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { recipes?: unknown }).recipes)
  ) {
    list = (data as { recipes: unknown[] }).recipes;
  } else if (isRecipeLike(data)) {
    list = [data];
  } else {
    throw new Error("JSON에 recipes 배열이 없습니다.");
  }
  const recipes = list.filter(isRecipeLike).map((r, i) => ({
    ...r,
    id: `r-${Date.now()}-${i}`,
    nutrition: {
      calories: Number(r.nutrition?.calories ?? 0) || 0,
      protein: Number(r.nutrition?.protein ?? 0) || 0,
      carbs: Number(r.nutrition?.carbs ?? 0) || 0,
      fat: Number(r.nutrition?.fat ?? 0) || 0,
      note: "AI 생성 참고 수치이며, 실제 영양 정보는 내부 데이터 기준으로 재계산됩니다.",
    },
  }));
  if (recipes.length === 0) {
    throw new Error("유효한 레시피가 없습니다.");
  }
  return recipes;
}

// ============================================================ 알레르기/기피 필터링

function normalizeName(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export function filterByRestrictions(recipes: Recipe[], restrictionsRaw: string): {
  recipes: Recipe[];
  warnings: string[];
} {
  // 중국어 등으로 입력한 제한 재료도 한글 재료명으로 변환하여 대조한다
  const restricted = splitIngredients(restrictionsRaw).map(translateToKorean);
  if (restricted.length === 0) return { recipes, warnings: [] };
  const warnings: string[] = [];
  const kept: Recipe[] = [];
  for (const recipe of recipes) {
    const bad = recipe.ingredients.filter((ing) =>
      restricted.some(
        (r) =>
          normalizeName(ing.name).includes(r) || r.includes(normalizeName(ing.name))
      )
    );
    if (bad.length > 0) {
      warnings.push(
        `${recipe.title}: 제한 재료(${bad.map((b) => b.name).join(", ")})가 포함되어 제외되었습니다.`
      );
    } else {
      kept.push(recipe);
    }
  }
  return { recipes: kept, warnings };
}

// ============================================================ LLM API 호출 (Groq / Gemini)

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.8-flash";

async function callGemini(prompt: string, apiKey: string, model = process.env.GEMINI_MODEL || DEFAULT_MODEL): Promise<string> {
  const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API 오류(${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("\n");
  if (!text) {
    throw new Error("Gemini API 응답에 텍스트가 없습니다.");
  }
  return text;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_SYSTEM_PROMPT =
  'You are a recipe generator. Respond with ONE valid JSON object only, in the form {"recipes":[...]}. No markdown, no text outside the JSON. Write all recipe text in Korean.';

async function callGroq(prompt: string, apiKey: string, model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL): Promise<string> {
  const payload: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: GROQ_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 8192, // gpt-oss 는 추론 모델이라 reasoning 토큰도 포함되므로 넉넉히 설정
    response_format: { type: "json_object" },
  };
  // reasoning_effort 는 gpt-oss 계열에서만 허용된다 (다른 모델에 보내면 400)
  // "low" 는 JSON 이 깨져 레시피가 1개만 파싱되는 경우가 잦아 기본값을 "medium" 으로 둔다.
  if (model.startsWith("openai/gpt-oss")) {
    const eff = (process.env.GROQ_REASONING_EFFORT ?? "").trim().toLowerCase();
    payload.reasoning_effort = eff === "low" || eff === "high" ? eff : "medium";
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const kind = res.status === 429 ? "요청 한도 초과 " : "";
    throw new Error(`Groq API ${kind}오류(${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  };
  const choice = data.choices?.[0];
  const text = choice?.message?.content;
  if (!text) {
    throw new Error(
      `Groq API 응답에 텍스트가 없습니다.${choice?.finish_reason ? ` (finish_reason=${choice.finish_reason})` : ""}`
    );
  }
  return text;
}

// ============================================================ Mock (데모 모드)
// 데모 모드 레시피는 사용자 입력 식재료와 매칭되는 규칙 엔진(lib/mock.ts)이 생성한다.

// ============================================================ 메인 진입점

export type LLMProvider = "groq" | "gemini" | "mock";

/** 사용할 제공방 결정: LLM_PROVIDER 지정 우선, 없으면 GROQ → GEMINI → mock 순 자동 선택 */
function resolveProvider(groqKey: string, geminiKey: string): LLMProvider {
  const env = (process.env.LLM_PROVIDER ?? "").trim().toLowerCase();
  if (env === "groq" || env === "gemini" || env === "mock") return env;
  if (groqKey) return "groq";
  if (geminiKey) return "gemini";
  return "mock";
}

/** 오류 메시지만 로그에 남기고, 혹시 포함된 API 키는 가린다 */
function safeErrorMessage(err: unknown, keys: string[]): string {
  let msg = err instanceof Error ? err.message : String(err);
  for (const k of keys) if (k) msg = msg.split(k).join("***");
  return msg;
}

/**
 * 한 제공방을 호출해 레시피를 파싱한다. Groq 는 응답 JSON 이 깨져 유효 레시피가 2개 미만이면
 * 1회 더 재시도한다(429 한도 초과는 재시도하지 않음). 모두 실패하면 예외를 던진다.
 */
async function tryProvider(
  p: "groq" | "gemini",
  key: string,
  prompt: string,
  allKeys: string[]
): Promise<Recipe[]> {
  const attempts = p === "groq" ? 2 : 1;
  let best: Recipe[] = [];
  let lastErr: unknown = new Error("레시피를 생성하지 못했습니다.");
  for (let a = 0; a < attempts && best.length < 2; a++) {
    try {
      const text = p === "groq" ? await callGroq(prompt, key) : await callGemini(prompt, key);
      const parsed = parseRecipes(text);
      if (parsed.length > best.length) best = parsed;
    } catch (err) {
      lastErr = err;
      console.error(`[nutrivibe] ${p} 호출 실패(${a + 1}/${attempts}):`, safeErrorMessage(err, allKeys));
      if (err instanceof Error && err.message.includes("(429)")) break;
    }
  }
  if (best.length === 0) throw lastErr;
  return best;
}

export async function generateRecipes(c: UserConditions): Promise<{
  recipes: Recipe[];
  warnings: string[];
  usedMock: boolean;
  provider?: LLMProvider;
}> {
  const groqKey = (process.env.GROQ_API_KEY ?? "").trim();
  const geminiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  const prompt = buildPrompt(c);

  let recipes: Recipe[] = [];
  let warnings: string[] = [];
  let usedMock = false;
  let provider: LLMProvider = "mock";

  const primary = resolveProvider(groqKey, geminiKey);
  // 시도 순서: 선택된 제공방 → (키가 있다면) 다른 제공방. mock 이 선택되면 시도 없음.
  const order: ("groq" | "gemini")[] =
    primary === "mock"
      ? []
      : primary === "groq"
        ? ["groq", "gemini"]
        : ["gemini", "groq"];
  const keyOf = { groq: groqKey, gemini: geminiKey };

  const allKeys = [groqKey, geminiKey];
  for (const p of order) {
    const key = keyOf[p];
    if (!key) continue; // 키 없는 제공방은 건너뜀
    try {
      recipes = await tryProvider(p, key, prompt, allKeys);
      provider = p;
      break;
    } catch {
      recipes = [];
      console.error(`[nutrivibe] ${p} 사용 불가, 다음 제공방 또는 데모 모드로 전환`);
    }
  }

  if (recipes.length === 0) {
    usedMock = true;
    provider = "mock";
  }

  if (recipes.length === 0) {
    const mock = mockRecipes(c);
    recipes = mock.recipes;
    if (mock.uncovered.length > 0) {
      warnings.push(
        `입력한 식재료 중 일부(${mock.uncovered.join(", ")})를 사용하는 레시피가 내장 라이브러리에 없어 추천에 반영되지 않았습니다. 다른 재료와 함께 시도해 주세요.`
      );
    }
  }

  const filtered = filterByRestrictions(recipes, c.restrictions);
  recipes = filtered.recipes;
  warnings = [...warnings, ...filtered.warnings];

  // 내부 영양 참고 데이터로 재계산 (AI 영양 수치는 최종 근거로 사용하지 않음)
  recipes = recipes.map((r) => {
    const est = estimateNutrition(r);
    return { ...r, nutrition: est };
  });

  // 목표 열량 대비 비율 계산 및 안내 (프로필 연동, 참고용)
  const goal = c.goalCalories;
  if (goal && goal > 0) {
    recipes = recipes.map((r) => ({
      ...r,
      nutrition: {
        ...r.nutrition,
        goalPct: Math.round((r.nutrition.calories / goal) * 100),
      },
    }));
    const high = recipes.filter((r) => (r.nutrition.goalPct ?? 0) > 115);
    if (high.length > 0) {
      warnings.push(
        `목표 열량(${goal} kcal) 대비 높은 레시피가 있습니다: ${high
          .map((r) => `${r.title}(${r.nutrition.goalPct}%)`)
          .join(", ")}. 참고용 안내이며 필요 시 다른 레시피를 선택하세요.`
      );
    }
  }

  return { recipes, warnings, usedMock, provider };
}
