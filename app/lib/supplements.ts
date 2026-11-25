import { storage, SUPPLEMENTS_EVENT } from "./storage";
import type { SupplementItem, SupplementLog } from "./types";

export { SUPPLEMENTS_EVENT };

export const DOSE_UNITS = ["정", "캡슐", "포", "ml", "g", "회"] as const;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isDoseTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function newSupplementId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `s-${crypto.randomUUID()}`;
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeSupplement(input: {
  id?: string;
  name: string;
  doseLabel: string;
  dailyCount: number;
  reminderTime: string | null;
}): { ok: true; item: SupplementItem } | { ok: false; error: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "영양제 이름을 입력해 주세요." };
  if (name.length > 80) return { ok: false, error: "이름은 80자 이내로 입력해 주세요." };
  const doseLabel = input.doseLabel.trim();
  if (doseLabel.length > 40) return { ok: false, error: "1회 분량은 40자 이내로 입력해 주세요." };
  const dailyCount = Number(input.dailyCount);
  if (!Number.isInteger(dailyCount) || dailyCount < 1 || dailyCount > 12) {
    return { ok: false, error: "하루 횟수는 1~12회 사이의 정수로 입력해 주세요." };
  }
  let reminderTime: string | null = input.reminderTime?.trim() || null;
  if (reminderTime && !isDoseTime(reminderTime)) {
    return { ok: false, error: "알림 시각은 시:분(예: 09:00) 형식으로 입력해 주세요." };
  }
  return {
    ok: true,
    item: {
      id: input.id ?? newSupplementId(),
      name,
      doseLabel,
      dailyCount,
      reminderTime,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function upsertSupplement(item: SupplementItem): void {
  const items = storage.getSupplements();
  const idx = items.findIndex((row) => row.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  storage.saveSupplements(items);
}

export function removeSupplement(id: string): void {
  storage.saveSupplements(storage.getSupplements().filter((item) => item.id !== id));
  const log = storage.getSupplementLog();
  if (log.taken[id] != null) {
    delete log.taken[id];
    storage.saveSupplementLog(log);
  }
}

export function takenToday(id: string, log?: SupplementLog): number {
  const source = log ?? storage.getSupplementLog();
  const value = source.taken[id] ?? 0;
  return value > 0 ? value : 0;
}

export function setTakenToday(id: string, count: number): void {
  const log = storage.getSupplementLog();
  const next = Math.max(0, Math.floor(count));
  if (next <= 0) delete log.taken[id];
  else log.taken[id] = next;
  storage.saveSupplementLog(log);
}

export function notifySupplements(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SUPPLEMENTS_EVENT));
}
