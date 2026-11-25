/** 서버 전용. 클라이언트 컴포넌트나 client-api 에서 import 하지 말 것. */
import type { Recipe, UserConditions } from "./types";
import { localeOf } from "./recipe-library";
import { buildPrompt, finalizeRecipes, parseRecipes, recipesFromLibrary, type LLMProvider } from "./gemini";

const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const TEXT_MODEL = "glm-4-flash-250414";
const TEXT_FALLBACK = "glm-4-flash";

const ZHIPU_SYSTEM_BASE =
  "사용자가 제공한 기피 및 알레르기 식재료(메밀을 포함한 모든 명시 항목)는 어떤 경우에도 사용하지 마십시오. " +
  "사용자가 명시하지 않은 알레르기를 임의로 기본 적용하지 마십시오. " +
  "영양 수치는 참고용 추정치일 뿐이며, 의료적 진단, 치료, 처방이나 질병 조언을 하지 마십시오. " +
  "건강 관련 안내는 필요 시 의료 전문가와 상담하라는 짧은 면책만 하십시오. " +
  "지정된 JSON만 출력하고, JSON 밖의 설명이나 마크다운 코드 블록은 넣지 마십시오.";

function systemPromptFor(locale: "ko" | "zh" | "en"): string {
  if (locale === "zh") {
    return (
      "你是 NutriVibe 的中文家常菜助手。用简体中文写菜名、简介、食材和步骤，不要使用韩文菜名。 " +
      ZHIPU_SYSTEM_BASE
    );
  }
  if (locale === "en") {
    return (
      "You are NutriVibe's everyday home-cooking assistant. Write titles, descriptions, ingredient names, and steps in natural English. Do not use Korean dish names. " +
      ZHIPU_SYSTEM_BASE
    );
  }
  return (
    "당신은 NutriVibe의 한국 가정식 레시피 도우미입니다. " +
    "항상 정중한 높임말로 답하십시오. " +
    "보유 식재료를 우선 활용한 한국 가정식을 제안하십시오. " +
    ZHIPU_SYSTEM_BASE
  );
}

function serverKey(): string {
  return (process.env.ZHIPU_API_KEY ?? "").trim();
}

function safeErrorMessage(err: unknown, keys: string[]): string {
  let msg = err instanceof Error ? err.message : String(err);
  for (const k of keys) if (k) msg = msg.split(k).join("***");
  return msg;
}

async function callZhipu(prompt: string, apiKey: string, models: string[] = [TEXT_MODEL, TEXT_FALLBACK], locale: "ko" | "zh" | "en" = "ko"): Promise<string> {
  let lastErr: unknown = new Error("모델을 호출하지 못했습니다.");
  for (const model of models) {
    try {
      const res = await fetch(ZHIPU_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPromptFor(locale) },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 8192,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        const status = res.status;
        await res.text().catch(() => "");
        lastErr = new Error(`zhipu (${status})`);
        if (status === 429) break;
        continue;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string | Array<{ text?: string }> | null } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      const text = Array.isArray(content)
        ? content.map((part) => (typeof part?.text === "string" ? part.text : "")).join("\n")
        : content;
      if (text && text.trim()) return text.trim();
      lastErr = new Error("zhipu empty");
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function resolveProvider(key: string): LLMProvider {
  const env = (process.env.LLM_PROVIDER ?? "").trim().toLowerCase();
  if (env === "mock") return "mock";
  if (key) return "zhipu";
  return "mock";
}

export async function generateJsonText(prompt: string): Promise<{
  text: string | null;
  provider: LLMProvider;
  usedMock: boolean;
}> {
  const key = serverKey();
  if (resolveProvider(key) === "mock") {
    return { text: null, provider: "mock", usedMock: true };
  }
  try {
    const text = await callZhipu(prompt, key);
    return { text, provider: "zhipu", usedMock: false };
  } catch (err) {
    console.error("[nutrivibe] zhipu JSON 호출 실패:", safeErrorMessage(err, [key]));
    return { text: null, provider: "mock", usedMock: true };
  }
}


export async function generateRecipes(c: UserConditions): Promise<{
  recipes: Recipe[];
  warnings: string[];
  usedMock: boolean;
  provider?: LLMProvider;
}> {
  const key = serverKey();
  const prompt = buildPrompt(c);

  let recipes: Recipe[] = [];
  let warnings: string[] = [];
  let usedMock = false;
  let provider: LLMProvider = "mock";

  if (resolveProvider(key) === "zhipu") {
    try {
      const text = await callZhipu(prompt, key, [TEXT_MODEL, TEXT_FALLBACK], localeOf(c));
      recipes = parseRecipes(text);
      provider = "zhipu";
    } catch (err) {
      recipes = [];
      console.error("[nutrivibe] zhipu 사용 불가, 데모 모드로 전환:", safeErrorMessage(err, [key]));
    }
  }

  if (recipes.length === 0) {
    usedMock = true;
    provider = "mock";
    const library = recipesFromLibrary(c);
    recipes = library.recipes;
    warnings = library.warnings;
  }

  const finalized = finalizeRecipes(recipes, c);
  recipes = finalized.recipes;
  warnings = [...warnings, ...finalized.warnings];

  return { recipes, warnings, usedMock, provider };
}
