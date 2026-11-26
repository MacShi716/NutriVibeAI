"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUi } from "@/components/UiProvider";

const DISMISS_KEY = "nutrivibe:onboardingDismissed";

export default function OnboardingGuide() {
  const { t } = useUi();
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
      className="nv-card nv-card--accent mb-5 p-4"
      data-testid="onboarding"
      aria-label={t.onboarding.label}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-900">{t.onboarding.title}</h2>
        <button type="button" onClick={close} className="nv-press shrink-0 text-xs font-medium text-gray-500 underline">
          {t.common.close}
        </button>
      </div>
      <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-gray-700">
        <li>{t.onboarding.step1}</li>
        <li>{t.onboarding.step2}</li>
        <li>{t.onboarding.step3}</li>
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        {t.onboarding.localBefore}{" "}
        <Link href="/profile#backup" className="font-medium text-brand-700 underline">
          {t.onboarding.backupLink}
        </Link>
        {t.onboarding.localAfter}
      </p>
    </section>
  );
}
