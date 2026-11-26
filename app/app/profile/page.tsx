"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUi } from "@/components/UiProvider";
import DailyNutrition from "@/components/DailyNutrition";
import DataBackup from "@/components/DataBackup";
import RestrictionPicker from "@/components/RestrictionPicker";
import { activityLabel, bmiLabel, format, localizeMessage } from "@/i18n/text";
import { ko } from "@/i18n/messages/ko";
import { CONDITIONS_EVENT, storage } from "@/lib/storage";
import { bmiBand, calcBMI, estimateDailyCalories, targetCalories } from "@/lib/profile";
import { trackEvent } from "@/lib/gamification";
import type { UserConditions, UserProfile } from "@/lib/types";

const EMPTY: Omit<UserProfile, "updatedAt"> = {
  heightCm: null,
  weightKg: null,
  bodyFatPct: null,
  gender: null,
  age: null,
  activityLevel: null,
  proteinGoalG: null,
};

export default function ProfilePage() {
  const { t } = useUi();
  const [form, setForm] = useState({ ...EMPTY });
  const [goal, setGoal] = useState<"maintain" | "lose" | "gain">("maintain");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [restrictions, setRestrictions] = useState("");

  useEffect(() => {
    const syncRestrictions = () => setRestrictions(storage.getConditions()?.restrictions ?? "");
    syncRestrictions();
    window.addEventListener(CONDITIONS_EVENT, syncRestrictions);
    return () => window.removeEventListener(CONDITIONS_EVENT, syncRestrictions);
  }, []);

  function updateRestrictions(value: string) {
    setRestrictions(value);
    const prev = storage.getConditions();
    const next: UserConditions = {
      ingredients: prev?.ingredients ?? "",
      preferences: prev?.preferences ?? "",
      restrictions: value,
      servings: prev?.servings ?? 2,
      cookMinutes: prev?.cookMinutes ?? 20,
      goalCalories: prev?.goalCalories ?? null,
      goalProtein: prev?.goalProtein ?? null,
      prioritizeExpiring: Boolean(prev?.prioritizeExpiring),
    };
    storage.saveConditions(next);
  }

  useEffect(() => {
    const p = storage.getProfile();
    if (p) {
      setForm({
        heightCm: p.heightCm,
        weightKg: p.weightKg,
        bodyFatPct: p.bodyFatPct,
        gender: p.gender,
        age: p.age,
        activityLevel: p.activityLevel,
        proteinGoalG: p.proteinGoalG ?? null,
      });
    }
  }, []);

  const bmi = useMemo(() => {
    if (form.heightCm && form.weightKg) {
      const value = calcBMI(form.heightCm, form.weightKg);
      return { value, band: bmiBand(value) };
    }
    return null;
  }, [form.heightCm, form.weightKg]);

  const estimate = useMemo(() => estimateDailyCalories(form), [form]);

  function num(v: string): number | null {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function save() {
    const protein = form.proteinGoalG;
    if (protein !== null && (protein < 1 || protein > 400)) {
      setError(ko.errors.proteinInput);
      setSaved(false);
      return;
    }
    setError("");
    const next: UserProfile = {
      ...form,
      heightCm: num(String(form.heightCm ?? "")),
      weightKg: num(String(form.weightKg ?? "")),
      bodyFatPct: form.bodyFatPct !== null ? num(String(form.bodyFatPct)) : null,
      age: form.age !== null ? num(String(form.age)) : null,
      proteinGoalG: protein === null ? null : Math.round(protein),
      updatedAt: new Date().toISOString(),
    };
    storage.saveProfile(next);
    setSaved(true);
    trackEvent({ type: "profile" });
    setTimeout(() => setSaved(false), 2000);
  }

  function reset() {
    storage.clearProfile();
    setForm({ ...EMPTY });
    setSaved(false);
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";
  const labelCls = "mb-1 block text-xs font-semibold text-gray-600";
  const goalLabel = goal === "maintain" ? t.profile.targetMaintain : goal === "lose" ? t.profile.targetLose : t.profile.targetGain;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">{t.profile.title}</h1>
      <p className="mt-1 text-sm text-gray-600">{t.profile.intro}</p>

      <div className="nv-card mt-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t.profile.height}</label>
            <input
              type="number"
              min={100}
              max={250}
              value={form.heightCm ?? ""}
              onChange={(e) => setForm({ ...form, heightCm: num(e.target.value) })}
              className={inputCls}
              placeholder="175"
            />
          </div>
          <div>
            <label className={labelCls}>{t.profile.weight}</label>
            <input
              type="number"
              min={30}
              max={250}
              value={form.weightKg ?? ""}
              onChange={(e) => setForm({ ...form, weightKg: num(e.target.value) })}
              className={inputCls}
              placeholder="70"
            />
          </div>
          <div>
            <label className={labelCls}>{t.profile.bodyFat}</label>
            <input
              type="number"
              min={3}
              max={60}
              value={form.bodyFatPct ?? ""}
              onChange={(e) => setForm({ ...form, bodyFatPct: num(e.target.value) })}
              className={inputCls}
              placeholder="20"
            />
          </div>
          <div>
            <label className={labelCls}>{t.profile.age}</label>
            <input
              type="number"
              min={10}
              max={100}
              value={form.age ?? ""}
              onChange={(e) => setForm({ ...form, age: num(e.target.value) })}
              className={inputCls}
              placeholder="22"
            />
          </div>
          <div>
            <label className={labelCls}>{t.profile.gender}</label>
            <select
              value={form.gender ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  gender: e.target.value === "" ? null : (e.target.value as "male" | "female"),
                })
              }
              className={inputCls}
            >
              <option value="">{t.profile.genderUnset}</option>
              <option value="male">{t.profile.male}</option>
              <option value="female">{t.profile.female}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{t.profile.activity}</label>
            <select
              value={form.activityLevel ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  activityLevel: e.target.value === "" ? null : (e.target.value as UserProfile["activityLevel"]),
                })
              }
              className={inputCls}
            >
              <option value="">{t.profile.genderUnset}</option>
              <option value="low">{t.profile.activityLow}</option>
              <option value="light">{t.profile.activityLight}</option>
              <option value="moderate">{t.profile.activityModerate}</option>
              <option value="high">{t.profile.activityHigh}</option>
              <option value="very_high">{t.profile.activityVeryHigh}</option>
            </select>
          </div>
          <div id="proteinGoal" className="scroll-mt-24">
            <label className={labelCls} htmlFor="proteinGoalInput">
              {t.profile.protein}
            </label>
            <input
              id="proteinGoalInput"
              type="number"
              min={1}
              max={400}
              value={form.proteinGoalG ?? ""}
              onChange={(e) => setForm({ ...form, proteinGoalG: num(e.target.value) })}
              className={inputCls}
              placeholder="80"
              data-testid="protein-goal"
            />
            <p className="mt-1 text-[11px] text-gray-400">{t.profile.proteinNote}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={save}
            className="nv-btn rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
          >
            {t.profile.save}
          </button>
          <button
            onClick={reset}
            className="nv-btn-secondary rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            {t.profile.reset}
          </button>
          {saved && <span className="self-center text-sm font-semibold text-green-600">{t.profile.saved}</span>}
          {error && <span className="self-center text-sm text-red-600">{localizeMessage(error, t)}</span>}
        </div>
      </div>

      <section id="restrictions" className="nv-card mt-5 scroll-mt-24 p-5">
        <h2 className="text-base font-bold text-gray-900">{t.profile.restrictionsTitle}</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.profile.restrictionsNote}</p>
        <div className="mt-3">
          <RestrictionPicker value={restrictions} onChange={updateRestrictions} inputId="profile-restrictions" />
        </div>
      </section>

      {bmi && (
        <div className="nv-card mt-5 p-5">
          <h2 className="text-base font-bold text-gray-900">{t.profile.bmiTitle}</h2>
          <div className="mt-3 flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-700">{bmi.value.toFixed(1)}</div>
              <div className="mt-1 text-xs text-gray-500">BMI</div>
            </div>
            <div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                {bmiLabel(t, bmi.band)}
              </span>
              <p className="mt-2 text-xs text-gray-500">{t.profile.bmiScale}</p>
            </div>
          </div>
          {form.bodyFatPct !== null && (
            <p className="mt-3 text-xs text-gray-500">{format(t.profile.bodyFatRecord, { n: form.bodyFatPct })}</p>
          )}
        </div>
      )}

      {estimate && form.activityLevel && (
        <div className="nv-card mt-5 p-5">
          <h2 className="text-base font-bold text-gray-900">{t.profile.calorieTitle}</h2>
          <p className="mt-1 text-xs text-gray-500">{t.profile.calorieNote}</p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="nv-tile px-2 py-3">
              <div className="text-xs text-gray-500">{t.profile.bmr}</div>
              <div className="mt-1 font-bold text-gray-900">{estimate.bmr} kcal</div>
            </div>
            <div className="nv-tile px-2 py-3">
              <div className="text-xs text-gray-500">{t.profile.tdee}</div>
              <div className="mt-1 font-bold text-gray-900">{estimate.tdee} kcal</div>
            </div>
            <div className="nv-tile px-2 py-3">
              <div className="text-xs text-gray-500">{t.profile.activityLabel}</div>
              <div className="mt-1 font-bold text-gray-900">{activityLabel(t, form.activityLevel)}</div>
            </div>
          </div>

          <div className="mt-4">
            <label className={labelCls}>{t.profile.goalLabel}</label>
            <div className="flex gap-2">
              {(
                [
                  ["maintain", t.profile.maintain],
                  ["lose", t.profile.lose],
                  ["gain", t.profile.gain],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setGoal(k)}
                  className={`nv-press rounded-lg border px-4 py-2 text-sm font-medium ${
                    goal === k
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-gray-700">
              {t.profile.target} <b className="text-brand-700">{targetCalories(estimate, goal)} kcal</b> ({goalLabel})
            </p>
            <p className="mt-2 text-xs text-gray-400">{t.profile.medical}</p>
          </div>
        </div>
      )}

      <div className="mt-5">
        <DailyNutrition />
      </div>

      <p className="mt-5 text-xs text-gray-400">{t.profile.localOnly}</p>
      <p className="mt-3 text-sm text-gray-600">
        {t.profile.supplementsLead}{" "}
        <Link href="/supplements" className="font-medium text-brand-700 underline">
          {t.profile.supplementsLink}
        </Link>{" "}
        {t.profile.supplementsTail}
      </p>
      <DataBackup />
    </div>
  );
}
