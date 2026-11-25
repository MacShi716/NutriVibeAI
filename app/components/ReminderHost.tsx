"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUi } from "@/components/UiProvider";
import { format } from "@/i18n/text";
import type { Messages } from "@/i18n/messages/types";
import { REMINDERS_EVENT, SUPPLEMENTS_EVENT, storage } from "@/lib/storage";
import {
  listDueReminders,
  listNotifyCandidates,
  markDismissed,
  markNotified,
  showSystemNotification,
  type DueReminder,
} from "@/lib/reminders";

function reminderText(item: DueReminder, messages: Messages): { title: string; body: string } {
  if (item.id === "veggieLunch") return { title: messages.reminders.lunchTitle, body: messages.reminders.lunchBody };
  if (item.id === "veggieDinner") return { title: messages.reminders.dinnerTitle, body: messages.reminders.dinnerBody };
  if (item.id === "grocery") return { title: messages.reminders.groceryTitle, body: messages.reminders.groceryBody };
  if (item.supplement) {
    return {
      title: messages.reminders.supplementTitle,
      body: format(messages.reminders.supplementBody, item.supplement),
    };
  }
  return { title: item.title, body: item.body };
}

export default function ReminderHost() {
  const { t } = useUi();
  const [visible, setVisible] = useState<DueReminder[]>([]);

  useEffect(() => {
    let cancelled = false;

    function refresh() {
      if (cancelled) return;
      const settings = storage.getReminderSettings();
      const due = listDueReminders(settings, storage.getSupplements());
      const state = storage.getReminderState();
      setVisible(due.filter((item) => !state.dismissed.includes(item.id)));
      if (settings.notify) {
        for (const item of listNotifyCandidates(due)) {
          if (state.notified.includes(item.id)) continue;
          const text = reminderText(item, t);
          if (showSystemNotification(text.title, text.body)) markNotified(item.id);
        }
      }
    }

    refresh();
    const timer = window.setInterval(refresh, 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener(REMINDERS_EVENT, refresh);
    window.addEventListener(SUPPLEMENTS_EVENT, refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(REMINDERS_EVENT, refresh);
      window.removeEventListener(SUPPLEMENTS_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [t]);

  if (visible.length === 0) return null;
  const current = visible[0];
  const text = reminderText(current, t);

  return (
    <div
      className="border-b border-amber-200 bg-amber-50"
      data-testid="reminder-banner"
      role="status"
    >
      <div className="mx-auto flex max-w-4xl items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">{text.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-800">{text.body}</p>
          {current.href && (
            <Link href={current.href} className="mt-1 inline-block text-xs font-medium text-brand-700 underline">
              {t.reminders.open}
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            markDismissed(current.id);
            setVisible((prev) => prev.filter((item) => item.id !== current.id));
          }}
          className="shrink-0 rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
        >
          {t.reminders.dismissToday}
        </button>
      </div>
    </div>
  );
}
