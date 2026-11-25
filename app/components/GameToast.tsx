"use client";

import { useEffect, useState } from "react";
import { useUi } from "@/components/UiProvider";
import { achievementCopy, format, levelTitle, missionTitle } from "@/i18n/text";
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
  const { t } = useUi();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function push(item: Omit<ToastItem, "id">) {
      const id = ++seq;
      setToasts((prev) => [...prev.slice(-3), { ...item, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3600);
    }

    function onGame(e: Event) {
      const detail = (e as CustomEvent<TrackResult>).detail;
      if (!detail) return;
      if (detail.leveledUp) {
        push({
          kind: "level",
          icon: "🎖️",
          title: format(t.toast.level, { level: detail.newLevel }),
          desc: format(t.toast.title, { title: levelTitle(t, detail.newLevel) }),
        });
      }
      for (const a of detail.newAchievements) {
        const copy = achievementCopy(t, a.id);
        push({
          kind: "achievement",
          icon: a.icon,
          title: format(t.toast.achievement, { title: copy?.title ?? a.title }),
          desc: copy?.desc ?? a.desc,
        });
      }
      for (const m of detail.completedMissions) {
        push({
          kind: "mission",
          icon: m.icon,
          title: format(t.toast.mission, { title: missionTitle(t, m.id) ?? m.title }),
          desc: format(t.toast.missionXp, { n: m.xp }),
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
          title: format(t.toast.xp, { n: detail.xpGained }),
          desc: t.toast.xpDesc,
        });
      }
    }

    window.addEventListener("nv:game", onGame);
    return () => window.removeEventListener("nv:game", onGame);
  }, [t]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-72 flex-col gap-2">
      {toasts.map((item) => (
        <div key={item.id} className="anim-toast-in rounded-xl border border-brand-100 bg-white px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">{item.icon}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-gray-900">{item.title}</div>
              <div className="truncate text-xs text-gray-500">{item.desc}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
