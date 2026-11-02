"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "사용자 조건 정리", desc: "보유 식재료 · 선호 · 제한 조건 확인" },
  { label: "프롬프트 구성", desc: "고정 프롬프트에 조건 결합" },
  { label: "AI API 호출", desc: "구조화된 JSON 레시피 요청" },
  { label: "JSON 및 제한 조건 검증", desc: "형식 검증 · 알레르기 필터링" },
  { label: "화면 표시", desc: "추천 레시피 로드 완료" },
];

export default function GenerationSteps({ done }: { done: boolean }) {
  const [timerStep, setTimerStep] = useState(0);
  const step = done ? STEPS.length : timerStep;

  useEffect(() => {
    // 마지막 단계는 응답이 도착한 뒤(done)에만 완료로 표시한다
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < STEPS.length; i++) {
      timers.push(setTimeout(() => setTimerStep(i), i * 650));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-4 w-4 rounded-full border-2 border-brand-600 border-t-transparent anim-pulse-soft" />
        <h2 className="text-base font-bold text-gray-900">
          AI 레시피 생성 진행 중
        </h2>
      </div>
      <ul className="space-y-3">
        {STEPS.map((s, i) => {
          const done = step > i;
          const active = step === i;
          return (
            <li
              key={s.label}
              className={`flex items-start gap-3 transition-opacity duration-300 ${
                active || done ? "opacity-100" : "opacity-40"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-brand-600 text-white anim-pulse-soft"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <div>
                <div
                  className={`text-sm font-semibold ${
                    done || active ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {s.label}
                </div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            </li>
          );
        })}
      </ul>
      {step >= STEPS.length && (
        <p className="mt-4 text-sm font-semibold text-brand-700 anim-pop">
          레시피 준비 완료! 결과 화면으로 이동합니다.
        </p>
      )}
    </div>
  );
}
