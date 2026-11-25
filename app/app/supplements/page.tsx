"use client";

import Link from "next/link";
import DiningCodeCard from "@/components/DiningCodeCard";
import ReminderSettingsPanel from "@/components/ReminderSettingsPanel";
import SupplementPlanner from "@/components/SupplementPlanner";
import { useUi } from "@/components/UiProvider";

export default function SupplementsPage() {
  const { t } = useUi();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t.supplementsPage.title}</h1>
        <p className="mt-1 text-sm text-gray-600">{t.supplementsPage.intro}</p>
        <Link href="/profile" className="mt-1 inline-block text-sm text-brand-600 hover:underline">
          {t.supplementsPage.back}
        </Link>
      </div>
      <SupplementPlanner />
      <ReminderSettingsPanel />
      <DiningCodeCard />
    </div>
  );
}
