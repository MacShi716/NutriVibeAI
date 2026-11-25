"use client";

import { useEffect, useState } from "react";
import { REMINDERS_EVENT, storage } from "@/lib/storage";
import {
  notificationPermission,
  notificationsAvailable,
  requestNotificationPermission,
} from "@/lib/reminders";
import type { ReminderSettings } from "@/lib/types";

function emptySettings(): ReminderSettings {
  return {
    veggieLunch: false,
    veggieDinner: false,
    grocery: false,
    notify: false,
    updatedAt: "",
  };
}

export default function ReminderSettingsPanel() {
  const [settings, setSettings] = useState<ReminderSettings>(emptySettings());
  const [permission, setPermission] = useState<"unsupported" | NotificationPermission>("unsupported");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      setSettings(storage.getReminderSettings());
      setPermission(notificationPermission());
      setReady(true);
    };
    load();
    window.addEventListener(REMINDERS_EVENT, load);
    return () => window.removeEventListener(REMINDERS_EVENT, load);
  }, []);

  function save(next: ReminderSettings) {
    const value = { ...next, updatedAt: new Date().toISOString() };
    setSettings(value);
    storage.saveReminderSettings(value);
  }

  async function enableNotify(on: boolean) {
    if (!on) {
      save({ ...settings, notify: false });
      return;
    }
    const granted = await requestNotificationPermission();
    setPermission(notificationPermission());
    save({ ...settings, notify: granted });
  }

  if (!ready) return null;

  const rows: Array<{ key: keyof Pick<ReminderSettings, "veggieLunch" | "veggieDinner" | "grocery">; label: string; hint: string }> = [
    { key: "veggieLunch", label: "점심 전 채소 안내", hint: "매일 오전 11:50 (기기 로컬 시간)" },
    { key: "veggieDinner", label: "저녁 전 채소 안내", hint: "매일 오후 5:50 (기기 로컬 시간)" },
    { key: "grocery", label: "쇼핑리스트 확인", hint: "수요일·일요일 오후 6:00 (기기 로컬 시간)" },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="reminder-settings">
      <h2 className="text-sm font-bold text-gray-900">알림</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        서버에 예약을 두지 않고, 이 기기의 로컬 시간과 브라우저 알림을 사용합니다. 앱을 열어 두시면 안내 배너가
        표시됩니다. 알림을 거부하셔도 배너는 그대로 이용할 수 있습니다.
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.key}>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-brand-600"
                checked={settings[row.key]}
                onChange={(e) => save({ ...settings, [row.key]: e.target.checked })}
              />
              <span>
                <span className="font-medium">{row.label}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{row.hint}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-brand-600"
          checked={settings.notify && permission === "granted"}
          disabled={!notificationsAvailable() || permission === "denied"}
          onChange={(e) => void enableNotify(e.target.checked)}
        />
        <span>
          브라우저 알림 사용
          <span className="mt-0.5 block text-xs text-gray-500">
            {!notificationsAvailable()
              ? "이 브라우저는 알림을 지원하지 않습니다. 앱을 열어 두시면 배너로 안내합니다."
              : permission === "denied"
                ? "알림이 거부되어 있습니다. 앱을 열어 두시면 배너로만 안내합니다."
                : "허용하시면 해당 시각 전후에 시스템 알림을 한 번 보여 드립니다."}
          </span>
        </span>
      </label>
    </section>
  );
}
