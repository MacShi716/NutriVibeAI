import { storage } from "./storage";
import { takenToday } from "./supplements";
import type { ReminderSettings, SupplementItem } from "./types";

export type ReminderKind = "veggieLunch" | "veggieDinner" | "grocery" | `supplement:${string}`;

export type DueReminder = {
  id: ReminderKind;
  title: string;
  body: string;
  href?: string;
  scheduledMinutes: number;
};

export const VEGGIE_LUNCH_MINUTES = 11 * 60 + 50;
export const VEGGIE_DINNER_MINUTES = 17 * 60 + 50;
export const GROCERY_MINUTES = 18 * 60;
const NOTIFY_WINDOW = 20;

function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseHm(value: string): number | null {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isGroceryDay(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 3;
}

export function isDue(nowMinutes: number, scheduled: number): boolean {
  return nowMinutes >= scheduled;
}

export function inNotifyWindow(nowMinutes: number, scheduled: number, windowMinutes = NOTIFY_WINDOW): boolean {
  return nowMinutes >= scheduled && nowMinutes < scheduled + windowMinutes;
}

export const REMINDER_COPY = {
  veggieLunch: {
    title: "점심 전 채소 안내",
    body: "점심 식사 전에 채소를 먼저 드셔 보세요. 습관 안내이며 의학적 지시가 아닙니다.",
  },
  veggieDinner: {
    title: "저녁 전 채소 안내",
    body: "저녁 식사 전에 채소를 먼저 드셔 보세요. 습관 안내이며 의학적 지시가 아닙니다.",
  },
  grocery: {
    title: "쇼핑리스트 확인",
    body: "수요일과 일요일 저녁, 부족한 식재료가 있는지 쇼핑리스트를 확인해 보세요.",
  },
} as const;

export function listDueReminders(
  settings: ReminderSettings,
  supplements: SupplementItem[],
  now: Date = new Date()
): DueReminder[] {
  const nowMinutes = minutesOf(now);
  const due: DueReminder[] = [];
  if (settings.veggieLunch && isDue(nowMinutes, VEGGIE_LUNCH_MINUTES)) {
    due.push({
      id: "veggieLunch",
      title: REMINDER_COPY.veggieLunch.title,
      body: REMINDER_COPY.veggieLunch.body,
      scheduledMinutes: VEGGIE_LUNCH_MINUTES,
    });
  }
  if (settings.veggieDinner && isDue(nowMinutes, VEGGIE_DINNER_MINUTES)) {
    due.push({
      id: "veggieDinner",
      title: REMINDER_COPY.veggieDinner.title,
      body: REMINDER_COPY.veggieDinner.body,
      scheduledMinutes: VEGGIE_DINNER_MINUTES,
    });
  }
  if (settings.grocery && isGroceryDay(now) && isDue(nowMinutes, GROCERY_MINUTES)) {
    due.push({
      id: "grocery",
      title: REMINDER_COPY.grocery.title,
      body: REMINDER_COPY.grocery.body,
      href: "/shopping-list",
      scheduledMinutes: GROCERY_MINUTES,
    });
  }
  for (const item of supplements) {
    if (!item.reminderTime) continue;
    const scheduled = parseHm(item.reminderTime);
    if (scheduled == null || !isDue(nowMinutes, scheduled)) continue;
    if (takenToday(item.id) >= item.dailyCount) continue;
    const dose = item.doseLabel ? ` (${item.doseLabel})` : "";
    due.push({
      id: `supplement:${item.id}`,
      title: "영양제 복용 시각",
      body: `${item.name}${dose}을(를) 복용할 시각입니다. 오늘 ${takenToday(item.id)}/${item.dailyCount}회 기록되었습니다.`,
      href: "/supplements",
      scheduledMinutes: scheduled,
    });
  }
  return due;
}

export function listNotifyCandidates(due: DueReminder[], now: Date = new Date()): DueReminder[] {
  const nowMinutes = minutesOf(now);
  return due.filter((item) => inNotifyWindow(nowMinutes, item.scheduledMinutes));
}

export function notificationsAvailable(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsAvailable()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsAvailable()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

export function showSystemNotification(title: string, body: string): boolean {
  if (!notificationsAvailable() || Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body });
    return true;
  } catch {
    return false;
  }
}

export function markDismissed(id: string): void {
  const state = storage.getReminderState();
  if (!state.dismissed.includes(id)) state.dismissed.push(id);
  storage.saveReminderState(state);
}

export function markNotified(id: string): void {
  const state = storage.getReminderState();
  if (!state.notified.includes(id)) state.notified.push(id);
  storage.saveReminderState(state);
}
