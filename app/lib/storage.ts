import { todayKey } from "./dates";
import type {
  UserConditions,
  GenerateResult,
  Recipe,
  UserProfile,
  PantryItem,
  WeeklyPlan,
  DailyLog,
  SupplementItem,
  SupplementLog,
  ReminderSettings,
} from "./types";

const KEY_CONDITIONS = "nutrivibe:conditions";
const KEY_LAST_RESULT = "nutrivibe:lastResult";
const KEY_FAVORITES = "nutrivibe:favorites";
const KEY_HISTORY = "nutrivibe:history";
const KEY_SHOPPING = "nutrivibe:shopping";
const KEY_PROFILE = "nutrivibe:profile";
const KEY_PANTRY = "nutrivibe:pantry";
const KEY_WEEKLY = "nutrivibe:weeklyPlan";
const KEY_DAILY = "nutrivibe:dailyLog";
const KEY_SUPPLEMENTS = "nutrivibe:supplements";
const KEY_SUPPLEMENT_LOG = "nutrivibe:supplementLog";
const KEY_REMINDERS = "nutrivibe:reminders";
const KEY_REMINDER_STATE = "nutrivibe:reminderState";

export const CONDITIONS_EVENT = "nutrivibe:conditions";
export const PROFILE_EVENT = "nutrivibe:profile";
export const SUPPLEMENTS_EVENT = "nutrivibe:supplements";
export const REMINDERS_EVENT = "nutrivibe:reminders";

function notify(name: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

function unchanged(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === JSON.stringify(value);
  } catch {
    return false;
  }
}

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 무시 (용량 초과 등)
  }
}

export const storage = {
  getConditions(): UserConditions | null {
    return read<UserConditions>(KEY_CONDITIONS);
  },
  saveConditions(c: UserConditions): void {
    if (unchanged(KEY_CONDITIONS, c)) return;
    write(KEY_CONDITIONS, c);
    notify(CONDITIONS_EVENT);
  },
  getLastResult(): GenerateResult | null {
    return read<GenerateResult>(KEY_LAST_RESULT);
  },
  saveLastResult(r: GenerateResult): void {
    write(KEY_LAST_RESULT, r);
    // 생성 기록 (최근 20개)
    const history = this.getHistory();
    history.unshift({
      title: r.recipes.map((x) => x.title).join(", "),
      generatedAt: r.generatedAt,
      recipeCount: r.recipes.length,
      usedMock: r.usedMock,
      conditions: r.conditions,
    });
    write(KEY_HISTORY, history.slice(0, 20));
    window.localStorage.removeItem(KEY_SHOPPING);
  },
  getFavorites(): Recipe[] {
    return read<Recipe[]>(KEY_FAVORITES) ?? [];
  },
  isFavorite(id: string): boolean {
    return this.getFavorites().some((r) => r.id === id);
  },
  toggleFavorite(recipe: Recipe): Recipe[] {
    const favs = this.getFavorites();
    const idx = favs.findIndex((r) => r.id === recipe.id);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.unshift(recipe);
    }
    write(KEY_FAVORITES, favs);
    return favs;
  },
  getHistory(): HistoryEntry[] {
    return read<HistoryEntry[]>(KEY_HISTORY) ?? [];
  },
  getShopping(): ShoppingStored {
    return read<ShoppingStored>(KEY_SHOPPING) ?? { items: [], updatedAt: null };
  },
  saveShopping(items: { name: string; amount: string; checked: boolean }[]): void {
    write(KEY_SHOPPING, { items, updatedAt: new Date().toISOString() });
  },
  getProfile(): UserProfile | null {
    return read<UserProfile>(KEY_PROFILE);
  },
  saveProfile(p: UserProfile): void {
    if (unchanged(KEY_PROFILE, p)) return;
    write(KEY_PROFILE, p);
    notify(PROFILE_EVENT);
  },
  clearProfile(): void {
    window.localStorage.removeItem(KEY_PROFILE);
    notify(PROFILE_EVENT);
  },
  getPantry(): PantryItem[] {
    return read<PantryItem[]>(KEY_PANTRY) ?? [];
  },
  savePantry(items: PantryItem[]): void {
    write(KEY_PANTRY, items);
  },
  getWeeklyPlan(): WeeklyPlan | null {
    return read<WeeklyPlan>(KEY_WEEKLY);
  },
  saveWeeklyPlan(plan: WeeklyPlan): void {
    write(KEY_WEEKLY, plan);
  },
  getDailyLog(): DailyLog {
    const today = todayKey();
    const raw = read<DailyLog>(KEY_DAILY);
    if (!raw || raw.date !== today || !Array.isArray(raw.entries)) {
      return { date: today, entries: [] };
    }
    return raw;
  },
  saveDailyLog(log: DailyLog): void {
    write(KEY_DAILY, log);
  },
  getSupplements(): SupplementItem[] {
    const raw = read<SupplementItem[]>(KEY_SUPPLEMENTS);
    return Array.isArray(raw) ? raw.filter((item) => item && typeof item.id === "string") : [];
  },
  saveSupplements(items: SupplementItem[]): void {
    if (unchanged(KEY_SUPPLEMENTS, items)) return;
    write(KEY_SUPPLEMENTS, items);
    notify(SUPPLEMENTS_EVENT);
  },
  getSupplementLog(): SupplementLog {
    const today = todayKey();
    const raw = read<SupplementLog>(KEY_SUPPLEMENT_LOG);
    if (!raw || raw.date !== today || !raw.taken || typeof raw.taken !== "object") {
      return { date: today, taken: {} };
    }
    return raw;
  },
  saveSupplementLog(log: SupplementLog): void {
    write(KEY_SUPPLEMENT_LOG, log);
    notify(SUPPLEMENTS_EVENT);
  },
  getReminderSettings(): ReminderSettings {
    const raw = read<ReminderSettings>(KEY_REMINDERS);
    return {
      veggieLunch: Boolean(raw?.veggieLunch),
      veggieDinner: Boolean(raw?.veggieDinner),
      grocery: Boolean(raw?.grocery),
      notify: Boolean(raw?.notify),
      updatedAt: raw?.updatedAt ?? "",
    };
  },
  saveReminderSettings(settings: ReminderSettings): void {
    if (unchanged(KEY_REMINDERS, settings)) return;
    write(KEY_REMINDERS, settings);
    notify(REMINDERS_EVENT);
  },
  getReminderState(): ReminderState {
    const today = todayKey();
    const raw = read<ReminderState>(KEY_REMINDER_STATE);
    if (!raw || raw.date !== today) {
      return { date: today, dismissed: [], notified: [] };
    }
    return {
      date: today,
      dismissed: Array.isArray(raw.dismissed) ? raw.dismissed : [],
      notified: Array.isArray(raw.notified) ? raw.notified : [],
    };
  },
  saveReminderState(state: ReminderState): void {
    write(KEY_REMINDER_STATE, state);
  },
};

export type HistoryEntry = {
  title: string;
  generatedAt: string;
  recipeCount: number;
  usedMock: boolean;
  conditions?: UserConditions | null; // 다시 생성용 조건 (선택)
};

type ShoppingStored = {
  items: { name: string; amount: string; checked: boolean }[];
  updatedAt: string | null;
};

export type ReminderState = {
  date: string;
  dismissed: string[];
  notified: string[];
};
