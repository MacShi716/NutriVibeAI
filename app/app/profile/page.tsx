"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CONDITIONS_EVENT, storage } from "@/lib/storage";
import DailyNutrition from "@/components/DailyNutrition";
import DataBackup from "@/components/DataBackup";
import RestrictionPicker from "@/components/RestrictionPicker";
import {
  bmiCategory,
  calcBMI,
  estimateDailyCalories,
  targetCalories,
} from "@/lib/profile";
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
      const v = calcBMI(form.heightCm, form.weightKg);
      return { value: v, category: bmiCategory(v) };
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
      setError("단백질 목표는 1~400g 사이로 입력해 주세요.");
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

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">내 신체 프로필</h1>
      <p className="mt-1 text-sm text-gray-600">
        키·몸무게 등 기본 정보를 저장하면 BMI 계산과 일일 권장 열량 추정에
        활용됩니다. 모든 정보는 브라우저(localStorage)에만 저장됩니다.
      </p>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>키 (cm)</label>
            <input
              type="number"
              min={100}
              max={250}
              value={form.heightCm ?? ""}
              onChange={(e) =>
                setForm({ ...form, heightCm: num(e.target.value) })
              }
              className={inputCls}
              placeholder="예: 175"
            />
          </div>
          <div>
            <label className={labelCls}>몸무게 (kg)</label>
            <input
              type="number"
              min={30}
              max={250}
              value={form.weightKg ?? ""}
              onChange={(e) =>
                setForm({ ...form, weightKg: num(e.target.value) })
              }
              className={inputCls}
              placeholder="예: 70"
            />
          </div>
          <div>
            <label className={labelCls}>체지방률 (%) · 선택</label>
            <input
              type="number"
              min={3}
              max={60}
              value={form.bodyFatPct ?? ""}
              onChange={(e) =>
                setForm({ ...form, bodyFatPct: num(e.target.value) })
              }
              className={inputCls}
              placeholder="예: 20"
            />
          </div>
          <div>
            <label className={labelCls}>나이 · 선택</label>
            <input
              type="number"
              min={10}
              max={100}
              value={form.age ?? ""}
              onChange={(e) => setForm({ ...form, age: num(e.target.value) })}
              className={inputCls}
              placeholder="예: 22"
            />
          </div>
          <div>
            <label className={labelCls}>성별 · 선택 (계산식용)</label>
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
              <option value="">선택 안 함</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>활동 수준 · 선택</label>
            <select
              value={form.activityLevel ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  activityLevel:
                    e.target.value === ""
                      ? null
                      : (e.target.value as UserProfile["activityLevel"]),
                })
              }
              className={inputCls}
            >
              <option value="">선택 안 함</option>
              <option value="low">거의 없음 (운동 안 함)</option>
              <option value="light">가벼운 활동 (주 1~3회)</option>
              <option value="moderate">보통 (주 3~5회)</option>
              <option value="high">활발함 (주 6~7회)</option>
              <option value="very_high">매우 활발함 (고강도)</option>
            </select>
          </div>
          <div id="proteinGoal" className="scroll-mt-24">
            <label className={labelCls} htmlFor="proteinGoalInput">
              단백질 목표 (g) · 선택
            </label>
            <input
              id="proteinGoalInput"
              type="number"
              min={1}
              max={400}
              value={form.proteinGoalG ?? ""}
              onChange={(e) => setForm({ ...form, proteinGoalG: num(e.target.value) })}
              className={inputCls}
              placeholder="예: 80"
              data-testid="protein-goal"
            />
            <p className="mt-1 text-[11px] text-gray-400">하루 단백질 목표입니다. 영양 정보는 참고용입니다.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={save}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
          >
            프로필 저장
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            초기화
          </button>
          {saved && (
            <span className="self-center text-sm font-semibold text-green-600">
              저장되었습니다.
            </span>
          )}
          {error && <span className="self-center text-sm text-red-600">{error}</span>}
        </div>
      </div>

      <section id="restrictions" className="mt-5 scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900">기피·알레르기</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          선택한 항목은 홈의 레시피 추천과 주간 식단에 함께 반영됩니다. 선택하면 바로 이 기기에 저장됩니다.
          의료적 진단이 아니며, 포장의 원재료명과 교차 오염은 직접 확인해 주세요.
        </p>
        <div className="mt-3">
          <RestrictionPicker value={restrictions} onChange={updateRestrictions} inputId="profile-restrictions" />
        </div>
      </section>

      {bmi && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-bold text-gray-900">BMI 계산 결과</h2>
          <div className="mt-3 flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-700">
                {bmi.value.toFixed(1)}
              </div>
              <div className="mt-1 text-xs text-gray-500">BMI</div>
            </div>
            <div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                {bmi.category}
              </span>
              <p className="mt-2 text-xs text-gray-500">
                대한비만학회 기준(참고용): 18.5 미만 저체중 · 18.5~22.9 정상 ·
                23~24.9 과체중 · 25 이상 비만
              </p>
            </div>
          </div>
          {form.bodyFatPct !== null && (
            <p className="mt-3 text-xs text-gray-500">
              체지방률: {form.bodyFatPct}% (참고 기록)
            </p>
          )}
        </div>
      )}

      {estimate && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-bold text-gray-900">
            일일 권장 열량 추정 (참고용)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Mifflin-St Jeor 공식과 활동 계수 기반 추정치입니다.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 px-2 py-3">
              <div className="text-xs text-gray-500">기초대사량 (BMR)</div>
              <div className="mt-1 font-bold text-gray-900">
                {estimate.bmr} kcal
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 px-2 py-3">
              <div className="text-xs text-gray-500">일일 소비량 추정</div>
              <div className="mt-1 font-bold text-gray-900">
                {estimate.tdee} kcal
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 px-2 py-3">
              <div className="text-xs text-gray-500">활동 수준</div>
              <div className="mt-1 font-bold text-gray-900">{estimate.label}</div>
            </div>
          </div>

          <div className="mt-4">
            <label className={labelCls}>식단 목표 · 참고용</label>
            <div className="flex gap-2">
              {(
                [
                  ["maintain", "유지"],
                  ["lose", "감량"],
                  ["gain", "증량"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setGoal(k)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                    goal === k
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-gray-700">
              목표별 하루 열량 참고:{" "}
              <b className="text-brand-700">{targetCalories(estimate, goal)} kcal</b>
              {" "}({goal === "maintain" ? "유지" : goal === "lose" ? "감량(약 15% 조정)" : "증량(약 10% 조정)"})
            </p>
            <p className="mt-2 text-xs text-gray-400">
              이 값은 일반적인 추정 공식 기반 참고치이며, 의학적 진단·처방을
              대신하지 않습니다. 질환·다이어트 관련 판단은 의사 또는 영양사와
              상담하세요.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5">
        <DailyNutrition />
      </div>

      <p className="mt-5 text-xs text-gray-400">
        프로필 정보는 이 기기(브라우저)에만 저장되며 서버로 전송되지 않습니다.
      </p>
      <p className="mt-3 text-sm text-gray-600">
        영양제 계획과 식사 전 안내, 쇼핑리스트 알림은{" "}
        <Link href="/supplements" className="font-medium text-brand-700 underline">
          영양제·알림
        </Link>
        에서 관리할 수 있습니다.
      </p>
      <DataBackup />
    </div>
  );
}
