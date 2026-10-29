"use client";

import { useEffect, useState } from "react";
import type { TrackResult } from "@/lib/gamification";

type ToastItem = {
  id: number;
  kind: "achievement" | "level" | "mission" | "xp";
  icon: string;
  title: string;
  desc: string;
};

let seq = 0;

export default function GameToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function push(item: Omit<ToastItem, "id">) {
      const id = ++seq;
      setToasts((prev) => [...prev.slice(-3), { ...item, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    }

    function onGame(e: Event) {
      const detail = (e as CustomEvent<TrackResult>).detail;
      if (!detail) return;
      if (detail.leveledUp) {
        push({
          kind: "level",
          icon: "🎖️",
          title: `레벨 ${detail.newLevel} 달성!`,
          desc: `새 칭호: ${detail.newTitle}`,
        });
      }
      for (const a of detail.newAchievements) {
        push({
          kind: "achievement",
          icon: a.icon,
          title: `업적 달성: ${a.title}`,
          desc: a.desc,
        });
      }
      for (const m of detail.completedMissions) {
        push({
          kind: "mission",
          icon: m.icon,
          title: `미션 완료: ${m.title}`,
          desc: `+${m.xp} 포인트`,
        });
      }
      if (
        detail.xpGained > 0 &&
        !detail.leveledUp &&
        detail.newAchievements.length === 0 &&
        detail.completedMissions.length === 0
      ) {
        push({
          kind: "xp",
          icon: "✨",
          title: `+${detail.xpGained} 포인트`,
          desc: "경험치를 획득했습니다",
        });
      }
    }

    window.addEventListener("nv:game", onGame);
    return () => window.removeEventListener("nv:game", onGame);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="anim-toast-in rounded-xl border border-brand-200 bg-white px-4 py-3 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{t.icon}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-gray-900">
                {t.title}
              </div>
              <div className="truncate text-xs text-gray-500">{t.desc}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
