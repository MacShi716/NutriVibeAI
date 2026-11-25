"use client";

import { useEffect, useState } from "react";
import { useUi } from "@/components/UiProvider";

export default function GenerationSteps({ done }: { done: boolean }) {
  const { t } = useUi();
  const steps = [
    { label: t.generation.step1, desc: t.generation.step1desc },
    { label: t.generation.step2, desc: t.generation.step2desc },
    { label: t.generation.step3, desc: t.generation.step3desc },
    { label: t.generation.step4, desc: t.generation.step4desc },
    { label: t.generation.step5, desc: t.generation.step5desc },
  ];
  const [timerStep, setTimerStep] = useState(0);
  const step = done ? steps.length : timerStep;

  useEffect(() => {
    // 마지막 단계는 응답이 도착한 뒤(done)에만 완료로 표시한다
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < steps.length; i++) {
      timers.push(setTimeout(() => setTimerStep(i), i * 650));
    }
    return () => timers.forEach(clearTimeout);
  }, [steps.length]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-4 w-4 rounded-full border-2 border-brand-600 border-t-transparent anim-pulse-soft" />
        <h2 className="text-base font-bold text-gray-900">{t.generation.title}</h2>
      </div>
      <ul className="space-y-3">
        {steps.map((s, i) => {
          const finished = step > i;
          const active = step === i;
          return (
            <li
              key={s.label}
              className={`flex items-start gap-3 transition-opacity duration-300 ${
                active || finished ? "opacity-100" : "opacity-40"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  finished
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-brand-600 text-white anim-pulse-soft"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {finished ? "✓" : i + 1}
              </span>
              <div>
                <div className={`text-sm font-semibold ${finished || active ? "text-gray-900" : "text-gray-500"}`}>
                  {s.label}
                </div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            </li>
          );
        })}
      </ul>
      {step >= steps.length && (
        <p className="mt-4 text-sm font-semibold text-brand-700 anim-pop">{t.generation.ready}</p>
      )}
    </div>
  );
}
