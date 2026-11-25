"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISS_KEY = "nutrivibe:onboardingDismissed";

export default function OnboardingGuide() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(DISMISS_KEY) !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  function close() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 저장할 수 없어도 이번 화면에서는 닫는다.
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <section
      className="mb-5 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm"
      data-testid="onboarding"
      aria-label="처음 사용 안내"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-900">처음이시라면 이 순서대로 이용해 주세요</h2>
        <button type="button" onClick={close} className="shrink-0 text-xs font-medium text-gray-500 underline">
          닫기
        </button>
      </div>
      <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-gray-700">
        <li>보유 식재료를 입력하거나 사진으로 추가합니다.</li>
        <li>기피·알레르기를 설정합니다.</li>
        <li>레시피를 추천받거나 주간 식단을 만듭니다.</li>
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        데이터는 이 기기에만 저장됩니다. 다른 기기로 옮기려면{" "}
        <Link href="/profile#backup" className="font-medium text-brand-700 underline">
          프로필의 백업
        </Link>
        을 사용해 주세요.
      </p>
    </section>
  );
}
