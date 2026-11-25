"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUi } from "@/components/UiProvider";
import { achievementCopy, format, levelTitle, missionTitle } from "@/i18n/text";
import {
  ACHIEVEMENTS,
  getGameState,
  levelForXp,
  MAX_LEVEL,
  todaysMissions,
  trackEvent,
  xpForLevel,
  type GameStats,
} from "@/lib/gamification";
import { TEMPLATES } from "@/lib/mock";
import { TOTAL_INGREDIENTS } from "@/lib/nutrition";

type RollResult = {
  title: string;
  desc: string;
  cookMinutes: number;
  ingredients: string[];
};

export default function GamePage() {
  const { t } = useUi();
  const [state, setState] = useState<GameStats | null>(null);
  const [spin, setSpin] = useState(false);
  const [roll, setRoll] = useState<RollResult | null>(null);

  useEffect(() => {
    setState(getGameState());
  }, []);

  const level = state ? levelForXp(state.xp) : 1;
  const curXp = state ? state.xp - xpForLevel(level) : 0;
  const needXp = 100;
  const isMax = level === MAX_LEVEL;
  const pct = isMax ? 100 : Math.min(100, Math.round((curXp / needXp) * 100));
  const title = levelTitle(t, level);

  const missions = useMemo(() => todaysMissions(), []);
  const collected = useMemo(
    () => (state ? Object.entries(state.ingredients).sort((a, b) => b[1] - a[1]) : []),
    [state]
  );

  if (!state) return null;

  function doRoll() {
    if (spin) return;
    setSpin(true);
    setRoll(null);
    setTimeout(() => {
      const picked = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
      setRoll({
        title: picked.title,
        desc: picked.desc,
        cookMinutes: picked.cookMinutes,
        ingredients: picked.build(2).map((i) => `${i.name} ${i.amount}`),
      });
      setSpin(false);
      trackEvent({ type: "roll" });
      setState(getGameState());
    }, 1400);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t.game.title}</h1>
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          {t.common.enterConditions}
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-amber-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-brand-600">{format(t.game.level, { level, title })}</div>
            <div className="mt-1 text-2xl font-black text-gray-900">{format(t.game.points, { n: state.xp })}</div>
            <div className="mt-1 text-xs text-gray-500">
              {isMax ? t.game.max : format(t.game.remain, { n: needXp - curXp })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">{format(t.game.streak, { n: state.streak })}</div>
            <div className="mt-1 text-xs text-gray-500">
              {format(t.game.dex, { have: collected.length, total: TOTAL_INGREDIENTS })}
            </div>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-amber-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-gray-400">
          <span>Lv.{level}</span>
          <span>Lv.{Math.min(level + 1, MAX_LEVEL)}</span>
        </div>
      </div>

      <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900">
          {t.game.missions} <span className="text-xs font-normal text-gray-400">{t.game.missionsHint}</span>
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {missions.map((m) => {
            const done = state.missions.done.includes(m.id);
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-3 ${done ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.icon}</span>
                  <span className={`text-sm font-semibold ${done ? "text-green-700" : "text-gray-700"}`}>
                    {done ? t.game.done : (missionTitle(t, m.id) ?? m.title)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">{format(t.game.reward, { n: m.xp })}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900">
          {t.game.roulette} <span className="text-xs font-normal text-gray-400">{t.game.rouletteHint}</span>
        </h2>
        <p className="mt-1 text-sm text-gray-600">{t.game.rouletteBody}</p>
        <div className="mt-4 flex items-center gap-5">
          <button
            onClick={doRoll}
            disabled={spin}
            className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-amber-500 text-4xl font-black text-white shadow-lg transition hover:scale-105 disabled:opacity-70 ${
              spin ? "anim-spin" : ""
            }`}
          >
            {spin ? "🎲" : "🍀"}
          </button>
          <div className="min-w-0 flex-1">
            {roll ? (
              <div className="anim-fade-up">
                <div className="text-lg font-bold text-gray-900">{roll.title}</div>
                <p className="mt-0.5 text-sm text-gray-600">{roll.desc}</p>
                <div className="mt-1 text-xs text-gray-500">
                  {format(t.game.rollMeta, {
                    minutes: roll.cookMinutes,
                    list: roll.ingredients.slice(0, 4).join(", "),
                  })}
                  {roll.ingredients.length > 4 ? t.game.rollMore : ""}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">{spin ? t.game.spinning : t.game.spinHint}</div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900">
          {t.game.achievements}{" "}
          <span className="text-xs font-normal text-gray-400">
            {format(t.game.unlocked, { have: state.achievements.length, total: ACHIEVEMENTS.length })}
          </span>
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const got = state.achievements.includes(a.id);
            const copy = achievementCopy(t, a.id);
            return (
              <div
                key={a.id}
                className={`rounded-xl border p-3 ${got ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50 opacity-60"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl grayscale-0">{a.icon}</span>
                  <span className={`text-sm font-bold ${got ? "text-amber-800" : "text-gray-500"}`}>
                    {got ? (copy?.title ?? a.title) : t.game.hidden}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{got ? (copy?.desc ?? a.desc) : t.game.locked}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900">
          {t.game.dexTitle}{" "}
          <span className="text-xs font-normal text-gray-400">
            {format(t.game.dexHint, { have: collected.length, total: TOTAL_INGREDIENTS })}
          </span>
        </h2>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-400 to-brand-500 transition-all duration-700"
            style={{ width: `${Math.round((collected.length / TOTAL_INGREDIENTS) * 100)}%` }}
          />
        </div>
        {collected.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">{t.game.dexEmpty}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {collected.map(([name, cnt]) => (
              <span key={name} className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                {name} ×{cnt}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
