import type {
  UserConditions,
  GenerateResult,
  Recipe,
  UserProfile,
} from "./types";

const KEY_CONDITIONS = "nutrivibe:conditions";
const KEY_LAST_RESULT = "nutrivibe:lastResult";
const KEY_FAVORITES = "nutrivibe:favorites";
const KEY_HISTORY = "nutrivibe:history";
const KEY_SHOPPING = "nutrivibe:shopping";
const KEY_PROFILE = "nutrivibe:profile";

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
    write(KEY_CONDITIONS, c);
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
    write(KEY_PROFILE, p);
  },
  clearProfile(): void {
    window.localStorage.removeItem(KEY_PROFILE);
  },
};

export type HistoryEntry = {
  title: string;
  generatedAt: string;
  recipeCount: number;
  usedMock: boolean;
  conditions?: UserConditions | null; // 다시 생성용 조건 (선택)
};

export type ShoppingStored = {
  items: { name: string; amount: string; checked: boolean }[];
  updatedAt: string | null;
};
