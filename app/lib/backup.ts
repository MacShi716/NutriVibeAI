/** 계정 없이 기기 간 데이터 이동: localStorage의 nutrivibe:* 항목을 JSON/동기화 코드로 내보내고 가져온다 */

const PREFIX = "nutrivibe:";

type Backup = { app: "nutrivibe"; version: 1; exportedAt: string; data: Record<string, string> };

export function exportBackup(): Backup {
  const data: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX)) data[k] = window.localStorage.getItem(k) ?? "";
  }
  return { app: "nutrivibe", version: 1, exportedAt: new Date().toISOString(), data };
}

export function toSyncCode(b: Backup): string {
  const bytes = new TextEncoder().encode(JSON.stringify(b));
  let bin = "";
  bytes.forEach((x) => (bin += String.fromCharCode(x)));
  return "NV1." + btoa(bin);
}

export function parseBackup(text: string): Backup {
  let t = text.trim();
  if (t.startsWith("NV1.")) {
    const bin = atob(t.slice(4).replace(/\s+/g, ""));
    t = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  const b = JSON.parse(t) as Partial<Backup>;
  if (b.app !== "nutrivibe" || b.version !== 1 || typeof b.data !== "object" || b.data === null) {
    throw new Error("invalid");
  }
  return b as Backup;
}

/** 가져온 데이터로 현재 기기의 nutrivibe:* 항목을 교체한다. 반환값: 복원된 항목 수 */
export function importBackup(b: Backup): number {
  const entries = Object.entries(b.data).filter(
    ([k, v]) => k.startsWith(PREFIX) && typeof v === "string"
  );
  const old: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX)) old.push(k);
  }
  old.forEach((k) => window.localStorage.removeItem(k));
  entries.forEach(([k, v]) => window.localStorage.setItem(k, v));
  return entries.length;
}
