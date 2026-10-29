"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ACHIEVEMENTS,
  getGameState,
  levelForXp,
  titleForLevel,
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
  const [state, setState] = useState<GameStats | null>(null);
  const [spin, setSpin] = useState(false);
  const [roll, setRoll] = useState<RollResult | null>(null);

  useEffect(() => {
    setState(getGameState());
  }, []);

  const level = state ? levelForXp(state.xp) : 1;
  const curXp = state ? state.xp - xpForLevel(level) : 0;
  const needXp = 100;
  const pct = Math.min(100, Math.round((curXp / needXp) * 100));
  const title = state ? titleForLevel(level) : titleForLevel(1);

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
      const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
      setRoll({
        title: t.title,
        desc: t.desc,
        cookMinutes: t.cookMinutes,
        ingredients: t.build(2).map((i) => `${i.name} ${i.amount}`),
      });
      setSpin(false);
      trackEvent({ type: "roll" });
      setState(getGameState());
    }, 1400);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">놀이터 · 재미 요소</h1>
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          조건 입력하러 가기
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-amber-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-brand-600">
              Lv.{level} · {title}
            </div>
            <div className="mt-1 text-2xl font-black text-gray-900">
              {state.xp} 포인트
            </div>
            <div className="mt-1 text-xs text-gray-500">
              레벨업까지 {Math.max(0, needXp - curXp)} 포인트 남음
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">
              연속 사용 {state.streak}일 🔥
            </div>
            <div className="mt-1 text-xs text-gray-500">
              도감 {collected.length}/{TOTAL_INGREDIENTS}종
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
          <span>Lv.{Math.min(level + 1, 10)}</span>
        </div>
      </div>

      <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900">
          오늘의 미션 <span className="text-xs font-normal text-gray-400">(매일 3개 새로 나옵니다)</span>
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {missions.map((m) => {
            const done = state.missions.done.includes(m.id);
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-3 ${
                  done ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.icon}</span>
                  <span
                    className={`text-sm font-semibold ${
                      done ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    {done ? "완료!" : m.title}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">보상 +{m.xp} 포인트</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900">
          오늘 뭐 먹지? <span className="text-xs font-normal text-gray-400">레시피 룰렛</span>
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          고민될 땐 룰렛을 돌려보세요. 내장 레시피 70여 종 중 하나를 골라드립니다.
        </p>
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
                  ⏱️ {roll.cookMinutes}분 · 재료: {roll.ingredients.slice(0, 4).join(", ")}
                  {roll.ingredients.length > 4 ? " 외" : ""}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                {spin ? "돌리는 중..." : "룰렛을 돌려 오늘의 메뉴를 뽑아보세요! (+5 포인트)"}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900">
          업적 <span className="text-xs font-normal text-gray-400">
            {state.achievements.length}/{ACHIEVEMENTS.length} 달성
          </span>
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const got = state.achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={`rounded-xl border p-3 ${
                  got
                    ? "border-amber-200 bg-amber-50"
                    : "border-gray-100 bg-gray-50 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl grayscale-0">{a.icon}</span>
                  <span className={`text-sm font-bold ${got ? "text-amber-800" : "text-gray-500"}`}>
                    {got ? a.title : "???"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{got ? a.desc : "조건을 채우면 해금"}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900">
          내 식재료 도감{" "}
          <span className="text-xs font-normal text-gray-400">
            {collected.length}/{TOTAL_INGREDIENTS}종 · 레시피 생성 시 자동 기록
          </span>
        </h2>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-400 to-brand-500 transition-all duration-700"
            style={{ width: `${Math.round((collected.length / TOTAL_INGREDIENTS) * 100)}%` }}
          />
        </div>
        {collected.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            아직 모은 식재료가 없습니다. 홈에서 레시피를 생성하면 입력한 식재료가 도감에 기록됩니다.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {collected.map(([name, cnt]) => (
              <span
                key={name}
                className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
              >
                {name} ×{cnt}
              </span>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
