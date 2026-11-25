"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { requestRecipes } from "@/lib/client-api";
import { storage } from "@/lib/storage";
import { calcOwnedUsage } from "@/lib/shopping";
import { isLoggedToday, notifyDaily, toggleDailyLog } from "@/lib/daily";
import { useCountUp } from "@/components/useCountUp";
import type { GenerateResult, Recipe } from "@/lib/types";

function GoalBadge({ goalPct }: { goalPct?: number | null }) {
  if (!goalPct) return null;
  const tone =
    goalPct <= 85
      ? "bg-green-50 text-green-700"
      : goalPct <= 115
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-600";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tone}`}>
      목표 대비 {goalPct}%
    </span>
  );
}

function CalorieBar({
  title,
  calories,
  max,
  delay,
}: {
  title: string;
  calories: number;
  max: number;
  delay: number;
}) {
  const v = useCountUp(calories, 800);
  const pct = max > 0 ? Math.max(8, Math.round((calories / max) * 100)) : 8;
  return (
    <div className="anim-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-700">{title}</span>
        <span className="text-gray-500">{v} kcal</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="bar-grow h-full rounded-full bg-brand-500"
          style={{ "--bar-w": `${pct}%`, animationDelay: `${delay + 200}ms` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [logged, setLogged] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = storage.getLastResult();
    setResult(saved);
    if (saved) {
      const flags: Record<string, boolean> = {};
      saved.recipes.forEach((recipe) => {
        flags[recipe.id] = isLoggedToday(recipe.id);
      });
      setLogged(flags);
    }
  }, []);

  function toggleLog(recipe: Recipe) {
    const on = toggleDailyLog(recipe);
    notifyDaily();
    setLogged((prev) => ({ ...prev, [recipe.id]: on }));
  }

  async function regenerate() {
    if (!result || regenerating) return;
    setRegenerating(true);
    try {
      const outcome = await requestRecipes(result.conditions);
      if (!outcome.ok) throw new Error(outcome.error);
      const next = outcome.result;
      storage.saveLastResult(next);
      setResult(next);
    } catch {
      alert("다시 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setRegenerating(false);
    }
  }

  const summary = useMemo(() => {
    if (!result || result.recipes.length === 0) return null;
    const total = result.recipes.reduce((a, r) => a + r.nutrition.calories, 0);
    const avg = Math.round(total / result.recipes.length);
    const max = Math.max(...result.recipes.map((r) => r.nutrition.calories));
    return { total, avg, max };
  }, [result]);

  if (!result) {
    return (
      <div className="anim-fade-up mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <p className="text-gray-600">아직 생성된 레시피가 없습니다.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
        >
          조건 입력하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="anim-fade-up mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">추천 레시피</h1>
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          조건 다시 입력
        </Link>
      </div>

      {result.usedMock && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ 데모 모드: API 키(GROQ_API_KEY 또는 GEMINI_API_KEY)가 설정되지 않았거나
          AI 호출에 실패하여 내장 데모 레시피가 표시됩니다. 서버 환경 변수에 키를 설정하면 실제 AI 생성 결과를
          받을 수 있습니다.
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="mb-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {result.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-gray-100 px-3 py-1">
          보유: {result.conditions.ingredients || "없음"}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1">
          인원 {result.conditions.servings}명 · {result.conditions.cookMinutes}분 이내
        </span>
        {result.conditions.restrictions && (
          <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">
            제한: {result.conditions.restrictions}
          </span>
        )}
        {result.conditions.goalCalories && (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700">
            목표 열량 {result.conditions.goalCalories} kcal
          </span>
        )}
      </div>

      {summary && (
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-gray-900">오늘의 식단 열량 요약</h2>
            <span className="text-xs text-gray-500">
              {result.recipes.length}개 합계 약 {summary.total} kcal · 평균 약 {summary.avg} kcal
            </span>
          </div>
          <div className="space-y-3">
            {result.recipes.map((r, i) => (
              <CalorieBar
                key={r.id}
                title={r.title}
                calories={r.nutrition.calories}
                max={summary.max}
                delay={i * 150}
              />
            ))}
          </div>
        </div>
      )}

      {result.recipes.length === 0 && (
        <div className="anim-fade-up mb-5 rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <div className="text-3xl">😥</div>
          <h2 className="mt-2 text-lg font-bold text-gray-900">
            죄송합니다. 일치하는 레시피를 찾지 못했습니다.
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            현재 레시피 라이브러리에 &quot;
            {result.conditions.ingredients || "입력한 식재료"}
            &quot;를 재료로 사용하는 레시피가 없습니다. 식재료를 줄이거나 다른
            재료를 추가해 다시 시도해 주세요.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href={`https://search.naver.com/search.naver?query=${encodeURIComponent(
                `${result.conditions.ingredients || "레시피"} 레시피`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              네이버에서 {result.conditions.ingredients || "해당 재료"} 레시피 검색
            </a>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(
                `${result.conditions.ingredients || "레시피"} 레시피`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              구글에서 검색
            </a>
          </div>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-brand-600 hover:underline"
          >
            조건을 다시 입력하러 가기
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {result.recipes.map((r, i) => {
          const usage = calcOwnedUsage(r.ingredients, result.conditions.ingredients);
          return (
            <article
              key={r.id}
              className="anim-fade-up rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <Link href={`/recipes/view?id=${encodeURIComponent(r.id)}`} className="group block">
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-brand-700">
                  {r.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{r.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">
                    {r.cookMinutes}분
                  </span>
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">
                    {r.servings}인분
                  </span>
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">
                    {r.nutrition.calories} kcal
                  </span>
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">
                    단백질 {r.nutrition.protein}g
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                    탄수 {r.nutrition.carbs}g · 지방 {r.nutrition.fat}g
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                    보유 활용 {usage.pct}%
                  </span>
                  <GoalBadge goalPct={r.nutrition.goalPct} />
                </div>
              </Link>
              <button
                type="button"
                onClick={() => toggleLog(r)}
                className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {logged[r.id] ? "오늘 식단에서 빼기" : "오늘 식단에 담기"}
              </button>
              <p className="mt-2 text-[11px] text-gray-400">영양 정보는 참고용입니다.</p>
            </article>
          );
        })}
      </div>

      {result.recipes.length > 0 && (
        <div className="mt-6 flex gap-3">
          <Link
            href="/shopping-list"
            className="flex-1 rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-700"
          >
            쇼핑리스트 자동 생성
          </Link>
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="flex-1 rounded-lg border border-brand-600 px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            {regenerating ? "생성 중..." : "다시 생성"}
          </button>
        </div>
      )}
    </div>
  );
}
