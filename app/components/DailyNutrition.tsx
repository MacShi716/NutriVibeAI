"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUi } from "@/components/UiProvider";
import { format } from "@/i18n/text";
import { DAILY_EVENT, resolveMacroGoals, type MacroGoals } from "@/lib/daily";
import { PROFILE_EVENT, storage } from "@/lib/storage";
import CalorieFormula from "@/components/CalorieFormula";
import { caloriePartsOf } from "@/lib/calories";
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
  const { t } = useUi();
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
    <section className="nv-card p-5" data-testid="daily-nutrition">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-900">{t.daily.title}</h2>
        <span className="text-xs text-gray-400">{format(t.daily.meals, { n: entries.length })}</span>
      </div>
      {entries.length === 0 && goals.calories == null && goals.protein == null ? (
        <p className="nv-empty nv-inset mt-3 px-3 py-3 text-xs text-gray-500">{t.daily.empty}</p>
      ) : (
        <div className="mt-3 space-y-3">
          <Bar label={t.daily.calories} value={sum.calories} goal={goals.calories} unit="kcal" />
          <CalorieFormula parts={caloriePartsOf(entries)} />
          {entries.length > 0 && (
            <ul className="space-y-1 text-xs text-gray-500">
              {entries.map((entry) => (
                <li key={entry.id}>
                  {entry.servingsLogged
                    ? format(t.daily.entryServings, { title: entry.title, calories: entry.calories, n: entry.servingsLogged })
                    : format(t.daily.entryMeta, { title: entry.title, calories: entry.calories })}
                </li>
              ))}
            </ul>
          )}
          <Bar label={t.daily.protein} value={sum.protein} goal={goals.protein} unit="g" />
          <Bar
            label={t.daily.carbs}
            value={sum.carbs}
            goal={goals.carbs}
            unit="g"
            note={goals.carbsIsReference ? t.common.reference : undefined}
          />
          <Bar
            label={t.daily.fat}
            value={sum.fat}
            goal={goals.fat}
            unit="g"
            note={goals.fatIsReference ? t.common.reference : undefined}
          />
        </div>
      )}
      {goals.protein == null && (
        <p className="mt-3 text-xs text-gray-500">
          {t.daily.noProtein}{" "}
          <Link href="/profile#proteinGoal" className="font-medium text-brand-700 underline">
            {t.daily.proteinLink}
          </Link>
        </p>
      )}
      <p className="mt-3 text-xs text-gray-400">{t.daily.note}</p>
    </section>
  );
}
