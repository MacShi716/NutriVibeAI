"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestRecipes } from "@/lib/client-api";
import { STATIC_HOST } from "@/lib/host";
import { storage, CONDITIONS_EVENT, PROFILE_EVENT } from "@/lib/storage";
import { estimateDailyCalories, targetCalories } from "@/lib/profile";
import { isValidServings, SERVINGS_ERROR, SERVINGS_MIN, SERVINGS_MAX } from "@/lib/limits";
import { collectIngredients, trackEvent } from "@/lib/gamification";
import { listExpiringNames, PANTRY_EVENT, syncPantry } from "@/lib/pantry";
import { splitIngredients } from "@/lib/shopping";
import DailyNutrition from "@/components/DailyNutrition";
import DiningCodeCard from "@/components/DiningCodeCard";
import IngredientAdder from "@/components/IngredientAdder";
import GenerationSteps from "@/components/GenerationSteps";
import OnboardingGuide from "@/components/OnboardingGuide";
import PantryEditor from "@/components/PantryEditor";
import PhotoIngredients from "@/components/PhotoIngredients";
import RestrictionPicker from "@/components/RestrictionPicker";
import type { UserConditions } from "@/lib/types";

const EMPTY: UserConditions = {
  ingredients: "",
  preferences: "",
  restrictions: "",
  servings: 2,
  cookMinutes: 20,
  goalCalories: null,
  goalProtein: null,
  prioritizeExpiring: false,
};

export default function HomePage() {
  const router = useRouter();
  // SSR/CSR 일치를 위해 localStorage는 mount 이후에만 읽는다
  const [form, setForm] = useState<UserConditions>(EMPTY);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"form" | "generating" | "done">("form");
  const [error, setError] = useState("");
  const [showDemoNote, setShowDemoNote] = useState(STATIC_HOST);
  const [profileGoals, setProfileGoals] = useState<{ calories: number | null; protein: number | null }>({
    calories: null,
    protein: null,
  });
  const hadSavedConditions = useRef(false);

  function readProfileGoals(): { calories: number | null; protein: number | null } {
    const profile = storage.getProfile();
    if (!profile) return { calories: null, protein: null };
    const estimate = estimateDailyCalories({
      gender: profile.gender,
      age: profile.age,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      activityLevel: profile.activityLevel,
    });
    return {
      calories: estimate ? targetCalories(estimate, "maintain") : null,
      protein: profile.proteinGoalG ?? null,
    };
  }

  useEffect(() => {
    const saved = storage.getConditions();
    hadSavedConditions.current = saved != null;
    setForm(saved ?? EMPTY);
    if (!STATIC_HOST) setShowDemoNote(storage.getLastResult()?.usedMock === true);
    setMounted(true);
  }, []);

  useEffect(() => {
    const onConditions = () => {
      const saved = storage.getConditions();
      if (!saved) return;
      setForm((prev) => (JSON.stringify(prev) === JSON.stringify(saved) ? prev : saved));
    };
    const onProfile = () => setProfileGoals(readProfileGoals());
    window.addEventListener(CONDITIONS_EVENT, onConditions);
    window.addEventListener(PROFILE_EVENT, onProfile);
    return () => {
      window.removeEventListener(CONDITIONS_EVENT, onConditions);
      window.removeEventListener(PROFILE_EVENT, onProfile);
    };
  }, []);

  // 유통기한은 재료 목록과 함께 저장된다. 입력 중에도 조건을 남겨 페이지를 옮겨도 목록이 비지 않게 한다.
  useEffect(() => {
    if (!mounted) return;
    storage.saveConditions(form);
  }, [mounted, form]);

  // 프로필 연동: 저장된 신체 프로필로 목표 열량을 계산해 기본 반영
  useEffect(() => {
    if (!mounted) return;
    setProfileGoals(readProfileGoals());
  }, [mounted]);
  const goalCal = profileGoals.calories;

  useEffect(() => {
    if (!mounted || hadSavedConditions.current) return;
    if (!profileGoals.calories && !profileGoals.protein) return;
    setForm((prev) => ({
      ...prev,
      goalCalories: profileGoals.calories ?? prev.goalCalories,
      goalProtein: profileGoals.protein ?? prev.goalProtein,
    }));
  }, [mounted, profileGoals]);

  function update<K extends keyof UserConditions>(key: K, value: UserConditions[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function rememberAmounts(names: string[], amounts: Record<string, string>) {
    const next = syncPantry(names, storage.getPantry()).map((item) => {
      const amount = amounts[item.name];
      return amount ? { ...item, amount } : item;
    });
    storage.savePantry(next);
    if (typeof window !== "undefined") window.dispatchEvent(new Event(PANTRY_EVENT));
  }

  function addIngredients(items: { name: string; amount: string }[] | string[]) {
    const rows = items.map((item) =>
      typeof item === "string" ? { name: item.trim(), amount: "" } : { name: item.name.trim(), amount: item.amount.trim() }
    ).filter((item) => item.name);
    if (rows.length === 0) return;
    setForm((prev) => {
      const merged = Array.from(new Set([...splitIngredients(prev.ingredients), ...rows.map((row) => row.name)]));
      const amounts: Record<string, string> = {};
      for (const row of rows) {
        if (row.amount) amounts[row.name] = row.amount;
      }
      if (Object.keys(amounts).length > 0) rememberAmounts(merged, amounts);
      return { ...prev, ingredients: merged.join(", ") };
    });
  }

  function addOneIngredient(name: string, amount: string) {
    addIngredients([{ name, amount }]);
  }

  const ingredientNames = useMemo(() => splitIngredients(form.ingredients), [form.ingredients]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidServings(form.servings)) {
      setError(SERVINGS_ERROR);
      return;
    }
    if (form.cookMinutes < 5 || form.cookMinutes > 180) {
      setError("조리 시간은 5~180분 사이로 입력해 주세요.");
      return;
    }
    storage.saveConditions(form);
    setPhase("generating");
    try {
      const outcome = await requestRecipes({
        ...form,
        expiringIngredients: form.prioritizeExpiring ? listExpiringNames(storage.getPantry()) : [],
      });
      if (!outcome.ok) {
        setError(outcome.error);
        setPhase("form");
        return;
      }
      const data = outcome.result;
      storage.saveLastResult(data);
      const count = splitIngredients(form.ingredients).length;
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
      <div className="mb-6">
        <DailyNutrition />
      </div>

      <OnboardingGuide />

      <section className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          오늘은 뭘 먹을까? <span className="text-brand-600">NutriVibe AI</span>가
          정해드립니다
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          보유 식재료와 식습관, 기피·알레르기 정보를 입력하면 맞춤 레시피 2~3개를
          제안하고, 부족한 식재료를 정리해 쇼핑리스트를 자동 생성합니다.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          로그인 없이 이 기기에만 저장됩니다.{" "}
          <Link href="/profile#backup" className="font-medium text-brand-700 underline">
            프로필의 백업
          </Link>
          에서 다른 기기로 옮길 수 있습니다.
        </p>
        {showDemoNote && (
          <p
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800"
            data-testid="demo-notice"
          >
            현재는 내장된 한국 가정식 레시피에서 추천하며, 온라인 AI를 호출하지 않습니다. 사진 인식은 예시
            식재료를 보여 드립니다.
          </p>
        )}
      </section>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        {mounted && (goalCal || profileGoals.protein) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm">
            <span className="text-gray-700">
              <b className="text-brand-700">내 프로필 연동</b>
              {goalCal ? (
                <>
                  {" "}
                  · 목표 열량 <b>{goalCal} kcal</b>
                </>
              ) : null}
              {profileGoals.protein ? (
                <>
                  {" "}
                  · 단백질 <b>{profileGoals.protein} g</b>
                </>
              ) : null}
            </span>
            <span className="flex flex-col items-end gap-1 text-xs text-gray-600">
              {goalCal && (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.goalCalories != null}
                    onChange={(e) => update("goalCalories", e.target.checked ? goalCal : null)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  열량 반영
                </label>
              )}
              {profileGoals.protein && (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.goalProtein != null}
                    onChange={(e) => update("goalProtein", e.target.checked ? profileGoals.protein : null)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  단백질 반영
                </label>
              )}
            </span>
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
          <div className="mt-2">
            <IngredientAdder onAdd={addOneIngredient} />
          </div>
          <div className="mt-2">
            <PhotoIngredients onAdd={addIngredients} />
          </div>
          {mounted && (
            <PantryEditor
              names={ingredientNames}
              prioritize={Boolean(form.prioritizeExpiring)}
              onPrioritize={(value) => update("prioritizeExpiring", value)}
            />
          )}
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
          <p className={labelCls} id="restrictions-label">
            기피 및 알레르기 <span className="text-amber-600">(위험 안내 대상)</span>
          </p>
          <RestrictionPicker
            value={form.restrictions}
            onChange={(value) => update("restrictions", value)}
            inputId="restrictions"
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
              min={SERVINGS_MIN}
              max={SERVINGS_MAX}
              step={1}
              className={inputCls}
              value={form.servings}
              onChange={(e) => update("servings", Number(e.target.value))}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={form.servings === count}
                  data-testid={`servings-chip-${count}`}
                  onClick={() => update("servings", count)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    form.servings === count
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {count}명
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {SERVINGS_MIN}~{SERVINGS_MAX}명까지 입력할 수 있습니다.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              손바닥만 한 단백질 양은 대략적인 참고입니다. 저울로 재거나 포장 표시를 확인하는 편이 더
              정확합니다. 영양 정보는 1인분 기준이며, 인원에 따라 재료 양이 늘어납니다.
            </p>
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
          data-testid="generate-recipes"
          className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          {STATIC_HOST ? "내장 레시피로 추천받기" : "AI 레시피 생성하기"}
        </button>
        <Link href="/meal-plan" className="block text-center text-sm font-medium text-brand-700 hover:underline">
          이 재료로 주간 식단표 만들기
        </Link>
      </form>

      <div className="mt-6 space-y-4">
        <DiningCodeCard />
        <p className="text-center text-sm text-gray-500">
          영양제 복용과 식사 전 안내는{" "}
          <Link href="/supplements" className="font-medium text-brand-700 underline">
            영양제·알림
          </Link>
          에서 설정할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
