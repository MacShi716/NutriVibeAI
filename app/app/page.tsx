"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestRecipes } from "@/lib/client-api";
import { USES_REMOTE_AI } from "@/lib/host";
import { storage, CONDITIONS_EVENT, PROFILE_EVENT } from "@/lib/storage";
import { estimateDailyCalories, targetCalories } from "@/lib/profile";
import { isValidServings, SERVINGS_MIN, SERVINGS_MAX } from "@/lib/limits";
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
import { useUi } from "@/components/UiProvider";
import { format, localizeMessage } from "@/i18n/text";
import { ko } from "@/i18n/messages/ko";
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
  const { t } = useUi();
  // SSR/CSR 일치를 위해 localStorage는 mount 이후에만 읽는다
  const [form, setForm] = useState<UserConditions>(EMPTY);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"form" | "generating" | "done">("form");
  const [error, setError] = useState("");
  const [showDemoNote, setShowDemoNote] = useState(!USES_REMOTE_AI);
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
    setShowDemoNote(storage.getLastResult()?.usedMock === true || (!USES_REMOTE_AI && storage.getLastResult() == null));
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
      setError(ko.errors.servings);
      return;
    }
    if (form.cookMinutes < 5 || form.cookMinutes > 180) {
      setError(ko.errors.cookInput);
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
      setError(ko.errors.server);
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
        <p className="mt-3 text-center text-xs text-gray-400">{t.generation.wait}</p>
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
          {t.home.titleLead} <span className="text-brand-600">NutriVibe AI</span>
          {t.home.titleTail}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.home.intro}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {t.home.localBefore}{" "}
          <Link href="/profile#backup" className="font-medium text-brand-700 underline">
            {t.home.backupLink}
          </Link>{" "}
          {t.home.localAfter}
        </p>
        {showDemoNote && (
          <p
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800"
            data-testid="demo-notice"
          >
            {USES_REMOTE_AI ? t.home.demoFallback : t.home.demo}
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
              <b className="text-brand-700">{t.home.profileLink}</b>
              {goalCal ? (
                <>
                  {" "}
                  · {t.home.goalCalories} <b>{goalCal} kcal</b>
                </>
              ) : null}
              {profileGoals.protein ? (
                <>
                  {" "}
                  · {t.home.protein} <b>{profileGoals.protein} g</b>
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
                  {t.home.applyCalories}
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
                  {t.home.applyProtein}
                </label>
              )}
            </span>
          </div>
        )}

        <div>
          <label className={labelCls} htmlFor="ingredients">
            {t.home.ingredients} <span className="text-gray-400">{t.home.ingredientsHint}</span>
          </label>
          <textarea
            id="ingredients"
            className={inputCls}
            rows={3}
            placeholder={t.home.ingredientsPlaceholder}
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
            {t.home.preferences}
          </label>
          <textarea
            id="preferences"
            className={inputCls}
            rows={2}
            placeholder={t.home.preferencesPlaceholder}
            value={form.preferences}
            onChange={(e) => update("preferences", e.target.value)}
          />
        </div>

        <div>
          <p className={labelCls} id="restrictions-label">
            {t.home.restrictions} <span className="text-amber-600">{t.home.restrictionsRisk}</span>
          </p>
          <RestrictionPicker
            value={form.restrictions}
            onChange={(value) => update("restrictions", value)}
            inputId="restrictions"
          />
          <p className="mt-1 text-xs text-gray-400">
            {t.home.restrictionsNote}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="servings">
              {t.home.servings}
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
                  {format(t.common.people, { n: count })}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {format(t.home.servingsRange, { min: SERVINGS_MIN, max: SERVINGS_MAX })}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">{t.home.palmNote}
            </p>
          </div>
          <div>
            <label className={labelCls} htmlFor="cookMinutes">
              {t.home.cookMinutes}
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
            {localizeMessage(error, t)}
          </div>
        )}

        <button
          type="submit"
          data-testid="generate-recipes"
          className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          {USES_REMOTE_AI ? t.home.generateAi : t.home.generateDemo}
        </button>
        <Link href="/meal-plan" className="block text-center text-sm font-medium text-brand-700 hover:underline">
          {t.home.weeklyCta}
        </Link>
      </form>

      <div className="mt-6 space-y-4">
        <DiningCodeCard />
        <p className="text-center text-sm text-gray-500">
          {t.home.supplementsLead}{" "}
          <Link href="/supplements" className="font-medium text-brand-700 underline">
            {t.home.supplementsLink}
          </Link>{" "}
          {t.home.supplementsTail}
        </p>
      </div>
    </div>
  );
}
