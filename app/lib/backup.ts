/** 계정 없이 기기 간 데이터 이동. nutrivibe:* localStorage를 JSON 또는 동기화 코드로 옮긴다. */

import { translateToKorean } from "./alias";
import { isValidServings } from "./limits";
import type { DailyLog, PantryItem, Recipe, ReminderSettings, SupplementItem, SupplementLog, UserConditions, UserProfile, WeeklyPlan } from "./types";
import type { HistoryEntry } from "./storage";

const PREFIX = "nutrivibe:";

export type Backup = {
  app: "nutrivibe";
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
};

export type ImportMode = "replace" | "merge";

const KEY = {
  profile: "nutrivibe:profile",
  favorites: "nutrivibe:favorites",
  history: "nutrivibe:history",
  shopping: "nutrivibe:shopping",
  game: "nutrivibe:game",
  weekly: "nutrivibe:weeklyPlan",
  pantry: "nutrivibe:pantry",
  daily: "nutrivibe:dailyLog",
  conditions: "nutrivibe:conditions",
  lastResult: "nutrivibe:lastResult",
  supplements: "nutrivibe:supplements",
  supplementLog: "nutrivibe:supplementLog",
  reminders: "nutrivibe:reminders",
} as const;

type ShoppingStored = {
  items: { name: string; amount: string; checked: boolean }[];
  updatedAt: string | null;
};

type GameShape = {
  xp?: number;
  totalRecipes?: number;
  totalMultiRecipes?: number;
  favorites?: number;
  favoritedIds?: string[];
  shoppingChecks?: number;
  profileSaved?: boolean;
  rolls?: number;
  ingredients?: Record<string, number>;
  lastVisitDay?: string;
  streak?: number;
  achievements?: string[];
  missions?: { date?: string; done?: string[] };
  today?: Record<string, number | string | boolean>;
};

export function exportBackup(): Backup {
  const data: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(PREFIX)) data[key] = window.localStorage.getItem(key) ?? "";
  }
  return { app: "nutrivibe", version: 1, exportedAt: new Date().toISOString(), data };
}

export function toSyncCode(backup: Backup): string {
  const bytes = new TextEncoder().encode(JSON.stringify(backup));
  let bin = "";
  bytes.forEach((x) => {
    bin += String.fromCharCode(x);
  });
  return `NV1.${btoa(bin)}`;
}

export function parseBackup(text: string): Backup {
  let raw = text.trim();
  if (raw.startsWith("NV1.")) {
    const bin = atob(raw.slice(4).replace(/\s+/g, ""));
    raw = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  const backup = JSON.parse(raw) as Partial<Backup>;
  if (
    backup.app !== "nutrivibe" ||
    backup.version !== 1 ||
    typeof backup.data !== "object" ||
    backup.data === null
  ) {
    throw new Error("invalid");
  }
  return backup as Backup;
}

function readJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function compactName(name: string): string {
  return translateToKorean(name).replace(/\s+/g, "").toLowerCase();
}

function mergeProfile(local: string | null, incoming: string): string {
  const current = readJson<UserProfile>(local);
  const next = readJson<UserProfile>(incoming);
  if (!current) return incoming;
  if (!next) return local ?? incoming;
  const currentAt = Date.parse(current.updatedAt) || 0;
  const nextAt = Date.parse(next.updatedAt) || 0;
  return nextAt >= currentAt ? incoming : local ?? incoming;
}

function mergeFavorites(local: string | null, incoming: string): string {
  const current = readJson<Recipe[]>(local) ?? [];
  const next = readJson<Recipe[]>(incoming) ?? [];
  if (!Array.isArray(current) || !Array.isArray(next)) return incoming;
  const map = new Map<string, Recipe>();
  for (const recipe of next) {
    if (recipe && typeof recipe.id === "string") map.set(recipe.id, recipe);
  }
  for (const recipe of current) {
    if (recipe && typeof recipe.id === "string" && !map.has(recipe.id)) map.set(recipe.id, recipe);
  }
  return JSON.stringify(Array.from(map.values()).slice(0, 200));
}

function mergeHistory(local: string | null, incoming: string): string {
  const current = readJson<HistoryEntry[]>(local) ?? [];
  const next = readJson<HistoryEntry[]>(incoming) ?? [];
  if (!Array.isArray(current) || !Array.isArray(next)) return incoming;
  const map = new Map<string, HistoryEntry>();
  for (const entry of [...next, ...current]) {
    if (!entry || typeof entry.generatedAt !== "string" || typeof entry.title !== "string") continue;
    const key = `${entry.generatedAt}|${entry.title}`;
    if (!map.has(key)) map.set(key, entry);
  }
  const merged = Array.from(map.values()).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  return JSON.stringify(merged.slice(0, 20));
}

function mergeShopping(local: string | null, incoming: string): string {
  const current = readJson<ShoppingStored>(local);
  const next = readJson<ShoppingStored>(incoming);
  if (!current?.items) return incoming;
  if (!next?.items) return local ?? incoming;
  const currentAt = Date.parse(current.updatedAt ?? "") || 0;
  const nextAt = Date.parse(next.updatedAt ?? "") || 0;
  const newer = nextAt >= currentAt ? next.items : current.items;
  const older = nextAt >= currentAt ? current.items : next.items;
  const map = new Map<string, ShoppingStored["items"][number]>();
  const put = (item: ShoppingStored["items"][number], primary: boolean) => {
    if (!item || typeof item.name !== "string") return;
    const key = compactName(item.name);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { name: item.name, amount: item.amount ?? "", checked: Boolean(item.checked) });
      return;
    }
    prev.checked = prev.checked || Boolean(item.checked);
    if (!primary && item.amount && !prev.amount.includes(item.amount)) {
      prev.amount = prev.amount ? `${prev.amount} + ${item.amount}` : item.amount;
    }
  };
  newer.forEach((item) => put(item, true));
  older.forEach((item) => put(item, false));
  const updatedAt = new Date(Math.max(currentAt, nextAt) || Date.now()).toISOString();
  return JSON.stringify({ items: Array.from(map.values()), updatedAt });
}

function maxNum(a: unknown, b: unknown): number {
  const left = typeof a === "number" && Number.isFinite(a) ? a : 0;
  const right = typeof b === "number" && Number.isFinite(b) ? b : 0;
  return Math.max(left, right);
}

function mergeGame(local: string | null, incoming: string): string {
  const current = readJson<GameShape>(local);
  const next = readJson<GameShape>(incoming);
  if (!current) return incoming;
  if (!next) return local ?? incoming;
  const ingredients: Record<string, number> = {};
  for (const source of [current.ingredients ?? {}, next.ingredients ?? {}]) {
    for (const [name, count] of Object.entries(source)) {
      ingredients[name] = Math.max(ingredients[name] ?? 0, typeof count === "number" ? count : 0);
    }
  }
  const favoritedIds = Array.from(new Set([...(current.favoritedIds ?? []), ...(next.favoritedIds ?? [])]));
  const achievements = Array.from(new Set([...(current.achievements ?? []), ...(next.achievements ?? [])]));
  const today = (current.lastVisitDay ?? "") >= (next.lastVisitDay ?? "") ? current.today : next.today;
  const missions = (current.missions?.date ?? "") >= (next.missions?.date ?? "") ? current.missions : next.missions;
  if (current.missions?.date && current.missions.date === next.missions?.date) {
    const done = Array.from(new Set([...(current.missions.done ?? []), ...(next.missions?.done ?? [])]));
    return JSON.stringify({
      ...current,
      ...next,
      xp: maxNum(current.xp, next.xp),
      totalRecipes: maxNum(current.totalRecipes, next.totalRecipes),
      totalMultiRecipes: maxNum(current.totalMultiRecipes, next.totalMultiRecipes),
      favorites: maxNum(current.favorites, next.favorites),
      favoritedIds,
      shoppingChecks: maxNum(current.shoppingChecks, next.shoppingChecks),
      profileSaved: Boolean(current.profileSaved || next.profileSaved),
      rolls: maxNum(current.rolls, next.rolls),
      ingredients,
      lastVisitDay: (current.lastVisitDay ?? "") >= (next.lastVisitDay ?? "") ? current.lastVisitDay : next.lastVisitDay,
      streak: maxNum(current.streak, next.streak),
      achievements,
      missions: { date: current.missions.date, done },
      today,
    });
  }
  return JSON.stringify({
    ...current,
    ...next,
    xp: maxNum(current.xp, next.xp),
    totalRecipes: maxNum(current.totalRecipes, next.totalRecipes),
    totalMultiRecipes: maxNum(current.totalMultiRecipes, next.totalMultiRecipes),
    favorites: maxNum(current.favorites, next.favorites),
    favoritedIds,
    shoppingChecks: maxNum(current.shoppingChecks, next.shoppingChecks),
    profileSaved: Boolean(current.profileSaved || next.profileSaved),
    rolls: maxNum(current.rolls, next.rolls),
    ingredients,
    lastVisitDay: (current.lastVisitDay ?? "") >= (next.lastVisitDay ?? "") ? current.lastVisitDay : next.lastVisitDay,
    streak: maxNum(current.streak, next.streak),
    achievements,
    missions,
    today,
  });
}

function mealIndex(plan: WeeklyPlan): Map<string, WeeklyPlan["days"][number]["meals"][number]> {
  const map = new Map<string, WeeklyPlan["days"][number]["meals"][number]>();
  for (const day of plan.days ?? []) {
    for (const meal of day.meals ?? []) {
      map.set(`${day.date}|${meal.slot}`, meal);
    }
  }
  return map;
}

function mergeWeekly(local: string | null, incoming: string): string {
  const current = readJson<WeeklyPlan>(local);
  const next = readJson<WeeklyPlan>(incoming);
  if (!current?.days) return incoming;
  if (!next?.days) return local ?? incoming;
  const currentAt = Date.parse(current.generatedAt) || 0;
  const nextAt = Date.parse(next.generatedAt) || 0;
  if (current.startDate !== next.startDate) {
    return nextAt >= currentAt ? incoming : local ?? incoming;
  }
  const newer = nextAt >= currentAt ? next : current;
  const older = newer === next ? current : next;
  const olderMeals = mealIndex(older);
  const days = newer.days.map((day) => ({
    ...day,
    meals: (day.meals ?? []).map((meal) => {
      const previous = olderMeals.get(`${day.date}|${meal.slot}`);
      if (meal.pinned && meal.recipe) return meal;
      if (previous?.pinned && previous.recipe) return previous;
      if (meal.recipe) return meal;
      return previous ?? meal;
    }),
  }));
  const warnings = Array.from(new Set([...(newer.warnings ?? []), ...(older.warnings ?? [])])).slice(0, 20);
  return JSON.stringify({ ...newer, days, warnings });
}

function mergePantry(local: string | null, incoming: string): string {
  const current = readJson<PantryItem[]>(local) ?? [];
  const next = readJson<PantryItem[]>(incoming) ?? [];
  if (!Array.isArray(current) || !Array.isArray(next)) return incoming;
  const map = new Map<string, PantryItem>();
  for (const item of current) {
    if (item && typeof item.name === "string" && item.name.trim()) {
      map.set(compactName(item.name), {
        name: item.name,
        amount: item.amount ?? null,
        purchasedOn: item.purchasedOn ?? null,
        expiresOn: item.expiresOn ?? null,
      });
    }
  }
  for (const item of next) {
    if (!item || typeof item.name !== "string" || !item.name.trim()) continue;
    const key = compactName(item.name);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { name: item.name, amount: item.amount ?? null, purchasedOn: item.purchasedOn ?? null, expiresOn: item.expiresOn ?? null });
      continue;
    }
    map.set(key, {
      name: prev.name,
      amount: item.amount || prev.amount,
      purchasedOn: item.purchasedOn || prev.purchasedOn,
      expiresOn: item.expiresOn || prev.expiresOn,
    });
  }
  return JSON.stringify(Array.from(map.values()));
}

function mergeDaily(local: string | null, incoming: string): string {
  const current = readJson<DailyLog>(local);
  const next = readJson<DailyLog>(incoming);
  if (!current?.entries) return incoming;
  if (!next?.entries) return local ?? incoming;
  if (current.date !== next.date) return current.date > next.date ? local ?? incoming : incoming;
  const map = new Map<string, DailyLog["entries"][number]>();
  for (const entry of current.entries) {
    if (entry && typeof entry.id === "string") map.set(entry.id, entry);
  }
  for (const entry of next.entries) {
    if (entry && typeof entry.id === "string" && !map.has(entry.id)) map.set(entry.id, entry);
  }
  return JSON.stringify({ date: current.date, entries: Array.from(map.values()) });
}

function preferText(current: unknown, next: unknown): string {
  if (typeof current === "string" && current.trim()) return current;
  return typeof next === "string" ? next : "";
}

function mergeConditions(local: string | null, incoming: string): string {
  const current = readJson<UserConditions>(local);
  const next = readJson<UserConditions>(incoming);
  if (!current) return incoming;
  if (!next) return local ?? incoming;
  const servings = isValidServings(current.servings) ? current.servings : next.servings;
  const cookMinutes =
    typeof current.cookMinutes === "number" && current.cookMinutes >= 5 ? current.cookMinutes : next.cookMinutes;
  return JSON.stringify({
    ingredients: preferText(current.ingredients, next.ingredients),
    preferences: preferText(current.preferences, next.preferences),
    restrictions: preferText(current.restrictions, next.restrictions),
    servings,
    cookMinutes,
    goalCalories: current.goalCalories ?? next.goalCalories ?? null,
    goalProtein: current.goalProtein ?? next.goalProtein ?? null,
    prioritizeExpiring: Boolean(current.prioritizeExpiring || next.prioritizeExpiring),
  });
}

function mergeLastResult(local: string | null, incoming: string): string {
  const current = readJson<{ generatedAt?: string }>(local);
  const next = readJson<{ generatedAt?: string }>(incoming);
  if (!current) return incoming;
  if (!next) return local ?? incoming;
  const currentAt = Date.parse(current.generatedAt ?? "") || 0;
  const nextAt = Date.parse(next.generatedAt ?? "") || 0;
  return nextAt >= currentAt ? incoming : local ?? incoming;
}

function mergeSupplements(local: string | null, incoming: string): string {
  const current = readJson<SupplementItem[]>(local) ?? [];
  const next = readJson<SupplementItem[]>(incoming) ?? [];
  if (!Array.isArray(current) || !Array.isArray(next)) return incoming;
  const map = new Map<string, SupplementItem>();
  for (const item of [...current, ...next]) {
    if (!item || typeof item.id !== "string" || typeof item.name !== "string") continue;
    const prev = map.get(item.id);
    if (!prev) {
      map.set(item.id, item);
      continue;
    }
    const prevAt = Date.parse(prev.updatedAt) || 0;
    const nextAt = Date.parse(item.updatedAt) || 0;
    map.set(item.id, nextAt >= prevAt ? item : prev);
  }
  return JSON.stringify(Array.from(map.values()));
}

function mergeSupplementLog(local: string | null, incoming: string): string {
  const current = readJson<SupplementLog>(local);
  const next = readJson<SupplementLog>(incoming);
  if (!current?.taken) return incoming;
  if (!next?.taken) return local ?? incoming;
  if (current.date !== next.date) return current.date > next.date ? local ?? incoming : incoming;
  return JSON.stringify({ date: current.date, taken: { ...next.taken, ...current.taken } });
}

function mergeReminders(local: string | null, incoming: string): string {
  const current = readJson<ReminderSettings>(local);
  const next = readJson<ReminderSettings>(incoming);
  if (!current) return incoming;
  if (!next) return local ?? incoming;
  const currentAt = Date.parse(current.updatedAt) || 0;
  const nextAt = Date.parse(next.updatedAt) || 0;
  return nextAt >= currentAt ? incoming : local ?? incoming;
}

function mergeValue(key: string, local: string | null, incoming: string): string {
  switch (key) {
    case KEY.profile:
      return mergeProfile(local, incoming);
    case KEY.favorites:
      return mergeFavorites(local, incoming);
    case KEY.history:
      return mergeHistory(local, incoming);
    case KEY.shopping:
      return mergeShopping(local, incoming);
    case KEY.game:
      return mergeGame(local, incoming);
    case KEY.weekly:
      return mergeWeekly(local, incoming);
    case KEY.pantry:
      return mergePantry(local, incoming);
    case KEY.daily:
      return mergeDaily(local, incoming);
    case KEY.conditions:
      return mergeConditions(local, incoming);
    case KEY.lastResult:
      return mergeLastResult(local, incoming);
    case KEY.supplements:
      return mergeSupplements(local, incoming);
    case KEY.supplementLog:
      return mergeSupplementLog(local, incoming);
    case KEY.reminders:
      return mergeReminders(local, incoming);
    default:
      return local ?? incoming;
  }
}

function localKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(PREFIX)) keys.push(key);
  }
  return keys;
}

/** 가져온 데이터로 현재 기기를 교체하거나 합친다. 반환값은 반영된 항목 수. */
export function importBackup(backup: Backup, mode: ImportMode): number {
  const entries = Object.entries(backup.data).filter(
    ([key, value]) => key.startsWith(PREFIX) && typeof value === "string"
  );
  if (mode === "replace") {
    localKeys().forEach((key) => window.localStorage.removeItem(key));
    entries.forEach(([key, value]) => window.localStorage.setItem(key, value));
    return entries.length;
  }
  if (mode === "merge") {
    const present = new Set(localKeys());
    for (const [key, value] of entries) {
      const merged = mergeValue(key, window.localStorage.getItem(key), value);
      window.localStorage.setItem(key, merged);
      present.add(key);
    }
    return present.size;
  }
  const never: never = mode;
  return never;
}
