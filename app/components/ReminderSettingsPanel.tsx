"use client";

import { useEffect, useState } from "react";
import { useUi } from "@/components/UiProvider";
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
  const { t } = useUi();
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
    { key: "veggieLunch", label: t.reminders.lunchLabel, hint: t.reminders.lunchHint },
    { key: "veggieDinner", label: t.reminders.dinnerLabel, hint: t.reminders.dinnerHint },
    { key: "grocery", label: t.reminders.groceryLabel, hint: t.reminders.groceryHint },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="reminder-settings">
      <h2 className="text-sm font-bold text-gray-900">{t.reminders.settingsTitle}</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.reminders.settingsBody}</p>
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
          {t.reminders.notify}
          <span className="mt-0.5 block text-xs text-gray-500">
            {!notificationsAvailable()
              ? t.reminders.unsupported
              : permission === "denied"
                ? t.reminders.denied
                : t.reminders.allowed}
          </span>
        </span>
      </label>
    </section>
  );
}
