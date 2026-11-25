"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DAILY_EVENT, resolveMacroGoals, type MacroGoals } from "@/lib/daily";
import { PROFILE_EVENT, storage } from "@/lib/storage";
import type { DailyEntry } from "@/lib/types";

function Bar({
  label,
  value,
  goal,
  unit,
  note,
}: {
  label: string;
  value: number;
  goal: number | null;
  unit: string;
  note?: string;
}) {
  const pct = goal && goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : value > 0 ? 100 : 0;
  const tone = goal && value > goal ? "bg-amber-500" : "bg-brand-500";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-gray-700">
          {label}
          {note ? <span className="ml-1 font-normal text-gray-400">{note}</span> : null}
        </span>
        <span className="text-gray-500">
          {value}
          {goal ? ` / ${goal}` : ""} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DailyNutrition() {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [goals, setGoals] = useState<MacroGoals | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      setEntries(storage.getDailyLog().entries);
      setGoals(resolveMacroGoals());
      setReady(true);
    };
    load();
    window.addEventListener(DAILY_EVENT, load);
    window.addEventListener(PROFILE_EVENT, load);
    return () => {
      window.removeEventListener(DAILY_EVENT, load);
      window.removeEventListener(PROFILE_EVENT, load);
    };
  }, []);

  if (!ready || !goals) return null;
  const sum = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: Math.round((acc.protein + entry.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + entry.carbs) * 10) / 10,
      fat: Math.round((acc.fat + entry.fat) * 10) / 10,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="daily-nutrition">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-900">오늘 영양 진행</h2>
        <span className="text-xs text-gray-400">{entries.length}끼 · 1인분 기준</span>
      </div>
      {entries.length === 0 && goals.calories == null && goals.protein == null ? (
        <p className="mt-2 text-xs text-gray-500">
          레시피에서 오늘 식단에 담으면 열량과 단백질, 탄수화물, 지방 진행이 여기에 표시됩니다.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <Bar label="열량" value={sum.calories} goal={goals.calories} unit="kcal" />
          <Bar label="단백질" value={sum.protein} goal={goals.protein} unit="g" />
          <Bar
            label="탄수화물"
            value={sum.carbs}
            goal={goals.carbs}
            unit="g"
            note={goals.carbsIsReference ? "참고" : undefined}
          />
          <Bar label="지방" value={sum.fat} goal={goals.fat} unit="g" note={goals.fatIsReference ? "참고" : undefined} />
        </div>
      )}
      {goals.protein == null && (
        <p className="mt-3 text-xs text-gray-500">
          단백질 목표가 없습니다.{" "}
          <Link href="/profile#proteinGoal" className="font-medium text-brand-700 underline">
            프로필에서 단백질 목표 입력
          </Link>
        </p>
      )}
      <p className="mt-3 text-xs text-gray-400">
        영양 정보는 참고용입니다. 탄수화물·지방 막대는 열량과 단백질 목표로 나눈 참고 배분입니다.
      </p>
    </section>
  );
}
