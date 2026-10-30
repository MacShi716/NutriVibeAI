"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { estimateDailyCalories, targetCalories } from "@/lib/profile";
import { collectIngredients, trackEvent } from "@/lib/gamification";
import GenerationSteps from "@/components/GenerationSteps";
import type { UserConditions } from "@/lib/types";

const EMPTY: UserConditions = {
  ingredients: "",
  preferences: "",
  restrictions: "",
  servings: 2,
  cookMinutes: 20,
  goalCalories: null,
};

export default function HomePage() {
  const router = useRouter();
  // SSR/CSR 일치를 위해 localStorage는 mount 이후에만 읽는다
  const [form, setForm] = useState<UserConditions>(EMPTY);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"form" | "generating" | "done">("form");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(storage.getConditions() ?? EMPTY);
    setMounted(true);
  }, []);

  // 프로필 연동: 저장된 신체 프로필로 목표 열량을 계산해 기본 반영
  const goalCal = useMemo(() => {
    if (!mounted) return null;
    const p = storage.getProfile();
    if (!p) return null;
    const est = estimateDailyCalories({
      gender: p.gender,
      age: p.age,
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      activityLevel: p.activityLevel,
    });
    return est ? targetCalories(est, "maintain") : null;
  }, [mounted]);

  useEffect(() => {
    if (goalCal && form.goalCalories === null) {
      setForm((prev) => ({ ...prev, goalCalories: goalCal }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalCal]);

  function update<K extends keyof UserConditions>(key: K, value: UserConditions[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.servings < 1 || form.servings > 12) {
      setError("식사 인원은 1~12명 사이로 입력해 주세요.");
      return;
    }
    if (form.cookMinutes < 5 || form.cookMinutes > 180) {
      setError("조리 시간은 5~180분 사이로 입력해 주세요.");
      return;
    }
    storage.saveConditions(form);
    setPhase("generating");
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "레시피 생성에 실패했습니다.");
        setPhase("form");
        return;
      }
      storage.saveLastResult(data);
      const count = form.ingredients
        .split(/[,，、\n]/)
        .map((x) => x.trim())
        .filter(Boolean).length;
      collectIngredients(form.ingredients);
      trackEvent({ type: "recipe", ingredientCount: count, cookMinutes: form.cookMinutes });
      setPhase("done");
      setTimeout(() => {
        router.push("/recipes");
      }, 500);
    } catch {
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setPhase("form");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700";

  if (phase !== "form") {
    return (
      <div className="mx-auto max-w-xl">
        <GenerationSteps done={phase === "done"} />
        <p className="mt-3 text-center text-xs text-gray-400">
          레시피 생성에는 일반적으로 10~20초가 소요됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="anim-fade-up mx-auto max-w-2xl">
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          오늘은 뭘 먹을까? <span className="text-brand-600">NutriVibe AI</span>가
          정해드립니다
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          보유 식재료와 식습관, 기피·알레르기 정보를 입력하면 AI가 맞춤 레시피 2~3개를
          제안하고, 부족한 식재료를 정리해 쇼핑리스트를 자동 생성합니다.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        {mounted && goalCal && (
          <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm">
            <span className="text-gray-700">
              <b className="text-brand-700">내 프로필 연동</b> · 목표 열량{" "}
              <b>{goalCal} kcal</b>이 반영됩니다.
            </span>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.goalCalories !== null}
                onChange={(e) =>
                  update("goalCalories", e.target.checked ? goalCal : null)
                }
                className="h-4 w-4 accent-brand-600"
              />
              반영
            </label>
          </div>
        )}

        <div>
          <label className={labelCls} htmlFor="ingredients">
            보유 식재료 <span className="text-gray-400">(쉼표로 구분)</span>
          </label>
          <textarea
            id="ingredients"
            className={inputCls}
            rows={3}
            placeholder="예: 쌀, 달걀, 양파, 감자, 두부, 대파"
            value={form.ingredients}
            onChange={(e) => update("ingredients", e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="preferences">
            식습관 및 선호
          </label>
          <textarea
            id="preferences"
            className={inputCls}
            rows={2}
            placeholder="예: 매운 음식 선호, 저염식, 한식 위주"
            value={form.preferences}
            onChange={(e) => update("preferences", e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="restrictions">
            기피 및 알레르기 <span className="text-amber-600">(위험 안내 대상)</span>
          </label>
          <textarea
            id="restrictions"
            className={inputCls}
            rows={2}
            placeholder="예: 땅콩, 새우, 우유"
            value={form.restrictions}
            onChange={(e) => update("restrictions", e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-400">
            시스템은 입력한 정보를 바탕으로 규칙 기반 필터링과 위험 안내를 수행하지만,
            절대적인 무알레르기를 보장하지 않습니다. 포장의 원재료명과 교차 오염을 직접
            확인하세요.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="servings">
              식사 인원
            </label>
            <input
              id="servings"
              type="number"
              min={1}
              max={12}
              className={inputCls}
              value={form.servings}
              onChange={(e) => update("servings", Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="cookMinutes">
              조리 시간 (분)
            </label>
            <input
              id="cookMinutes"
              type="number"
              min={5}
              max={180}
              className={inputCls}
              value={form.cookMinutes}
              onChange={(e) => update("cookMinutes", Number(e.target.value))}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          AI 레시피 생성하기
        </button>
      </form>
    </div>
  );
}
