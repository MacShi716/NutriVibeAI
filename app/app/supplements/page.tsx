"use client";

import Link from "next/link";
import DiningCodeCard from "@/components/DiningCodeCard";
import ReminderSettingsPanel from "@/components/ReminderSettingsPanel";
import SupplementPlanner from "@/components/SupplementPlanner";

export default function SupplementsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">영양제·알림</h1>
        <p className="mt-1 text-sm text-gray-600">
          하루 영양제 계획과 식사 전 안내, 쇼핑리스트 알림을 이 기기에서 관리합니다.
        </p>
        <Link href="/profile" className="mt-1 inline-block text-sm text-brand-600 hover:underline">
          내 프로필로 돌아가기
        </Link>
      </div>
      <SupplementPlanner />
      <ReminderSettingsPanel />
      <DiningCodeCard />
    </div>
  );
}
