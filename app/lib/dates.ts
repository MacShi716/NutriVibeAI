/** 로컬 날짜(YYYY-MM-DD). 타임존 오차를 피하려고 자정 문자열이 아닌 연·월·일로 계산한다. */

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return todayKey(dt);
}

export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 0=일요일 … 6=토요일. 화면 문구는 로케일 파일에서 고른다. */
export function weekdayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function weekdayKo(iso: string): string {
  return WEEKDAY_KO[weekdayIndex(iso)] ?? "";
}
