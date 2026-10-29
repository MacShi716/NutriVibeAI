// ============================================================
// NutriVibe AI 게이미피케이션(재미 요소) 모듈
// 포인트·레벨·업적·일일 미션·식재료 도감 — localStorage 기반
// ============================================================

import { translateToKorean } from "./alias";
import { lookupNutrition } from "./nutrition";

const KEY = "nutrivibe:game";

export type TodayCounts = {
  date: string;
  recipes: number;
  multiRecipes: number;
  fastRecipes: number;
  favorites: number;
  checks: number;
  rolls: number;
  profile: boolean;
};

export type GameStats = {
  xp: number;
  totalRecipes: number;
  totalMultiRecipes: number;
  favorites: number;
  shoppingChecks: number;
  profileSaved: boolean;
  rolls: number;
  ingredients: Record<string, number>;
  lastVisitDay: string;
  streak: number;
  achievements: string[];
  missions: { date: string; done: string[] };
  today: TodayCounts;
};

export type GameEvent =
  | { type: "recipe"; ingredientCount: number; cookMinutes: number }
  | { type: "favorite" }
  | { type: "shoppingCheck" }
  | { type: "profile" }
  | { type: "roll" }
  | { type: "visit" };

export type AchievementDef = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  check: (s: GameStats) => boolean;
};

export type MissionDef = {
  id: string;
  icon: string;
  title: string;
  xp: number;
  check: (t: TodayCounts) => boolean;
};

export type TrackResult = {
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newTitle: string;
  newAchievements: { id: string; icon: string; title: string; desc: string }[];
  completedMissions: { id: string; icon: string; title: string; xp: number }[];
};

// ---------- 기본 상태 ----------

function emptyToday(): TodayCounts {
  return {
    date: todayKey(),
    recipes: 0,
    multiRecipes: 0,
    fastRecipes: 0,
    favorites: 0,
    checks: 0,
    rolls: 0,
    profile: false,
  };
}

function defaultStats(): GameStats {
  return {
    xp: 0,
    totalRecipes: 0,
    totalMultiRecipes: 0,
    favorites: 0,
    shoppingChecks: 0,
    profileSaved: false,
    rolls: 0,
    ingredients: {},
    lastVisitDay: "",
    streak: 0,
    achievements: [],
    missions: { date: todayKey(), done: [] },
    today: emptyToday(),
  };
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function load(): GameStats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultStats();
    const s = { ...defaultStats(), ...(JSON.parse(raw) as Partial<GameStats>) };
    // 날짜가 바뀌면 오늘 카운트/미션 초기화, 방문 스트릭 갱신은 visit 이벤트에서 처리
    if (s.today.date !== todayKey()) {
      s.today = emptyToday();
      s.missions = { date: todayKey(), done: [] };
    }
    return s;
  } catch {
    return defaultStats();
  }
}

function save(s: GameStats): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 용량 초과 등 무시
  }
}

// ---------- 레벨·칭호 ----------

export const MAX_LEVEL = 10;

export function levelForXp(xp: number): number {
  return Math.min(Math.floor(xp / 100) + 1, MAX_LEVEL);
}

export function xpForLevel(level: number): number {
  return (level - 1) * 100;
}

export const TITLES: Record<number, string> = {
  1: "냉장고 견습생",
  2: "밥솥 초보",
  3: "집밥 요리사",
  4: "반찬 장인",
  5: "미식가",
  6: "홈 레스토랑",
  7: "홈셰프",
  8: "테이블 마스터",
  9: "요리 마스터",
  10: "레전드 셰프",
};

export function titleForLevel(level: number): string {
  return TITLES[Math.min(level, MAX_LEVEL)] ?? TITLES[1];
}

// ---------- 업적 ----------

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_recipe", icon: "🍳", title: "첫 요리", desc: "레시피를 처음 생성했다", check: (s) => s.totalRecipes >= 1 },
  { id: "recipe_10", icon: "📚", title: "레시피 수집가", desc: "레시피를 10회 생성했다", check: (s) => s.totalRecipes >= 10 },
  { id: "recipe_30", icon: "🏆", title: "레시피 마니아", desc: "레시피를 30회 생성했다", check: (s) => s.totalRecipes >= 30 },
  { id: "multi_3", icon: "🧺", title: "냉장고 정리왕", desc: "보유 식재료 3종 이상으로 레시피를 만들었다", check: (s) => s.totalMultiRecipes >= 1 },
  { id: "pantry_10", icon: "🥬", title: "식재료 수집가", desc: "식재료 도감 10종을 모았다", check: (s) => Object.keys(s.ingredients).length >= 10 },
  { id: "pantry_25", icon: "🎖️", title: "식재료 박물관", desc: "식재료 도감 25종을 모았다", check: (s) => Object.keys(s.ingredients).length >= 25 },
  { id: "fav_1", icon: "⭐", title: "첫 즐겨찾기", desc: "레시피를 처음 즐겨찾기했다", check: (s) => s.favorites >= 1 },
  { id: "fav_5", icon: "🌟", title: "맛집 단골", desc: "레시피를 5개 즐겨찾기했다", check: (s) => s.favorites >= 5 },
  { id: "shop_10", icon: "🛒", title: "쇼핑 마스터", desc: "쇼핑리스트를 10번 체크했다", check: (s) => s.shoppingChecks >= 10 },
  { id: "profile_ok", icon: "💪", title: "건강 챙김", desc: "내 신체 프로필을 저장했다", check: (s) => s.profileSaved },
  { id: "streak_3", icon: "🔥", title: "꾸준함의 힘", desc: "3일 연속 사용했다", check: (s) => s.streak >= 3 },
  { id: "roll_3", icon: "🎡", title: "행운의 요리사", desc: "오늘 뭐 먹지? 룰렛을 3번 돌렸다", check: (s) => s.rolls >= 3 },
];

// ---------- 일일 미션 ----------

const MISSION_POOL: MissionDef[] = [
  { id: "m_recipe", icon: "🍳", title: "레시피 1회 생성하기", xp: 15, check: (t) => t.recipes >= 1 },
  { id: "m_multi", icon: "🧺", title: "보유 식재료 3종 이상으로 생성", xp: 15, check: (t) => t.multiRecipes >= 1 },
  { id: "m_fast", icon: "⏱️", title: "20분 이내 레시피 생성", xp: 15, check: (t) => t.fastRecipes >= 1 },
  { id: "m_fav", icon: "⭐", title: "레시피 1개 즐겨찾기", xp: 10, check: (t) => t.favorites >= 1 },
  { id: "m_check", icon: "🛒", title: "쇼핑리스트 3개 체크", xp: 10, check: (t) => t.checks >= 3 },
  { id: "m_roll", icon: "🎡", title: "룰렛 1번 돌리기", xp: 10, check: (t) => t.rolls >= 1 },
  { id: "m_profile", icon: "💪", title: "내 프로필 저장", xp: 20, check: (t) => t.profile },
];

// 날짜 기반으로 오늘의 미션 3개를 결정적으로 뽑는다 (하루 동안 동일)
export function todaysMissions(): MissionDef[] {
  const seedStr = todayKey();
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  const pool = [...MISSION_POOL];
  const picked: MissionDef[] = [];
  while (picked.length < 3 && pool.length > 0) {
    const idx = h % pool.length;
    h = (h * 1103515245 + 12345) >>> 0;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

// ---------- 이벤트 처리 ----------

export function trackEvent(evt: GameEvent): TrackResult {
  const s = load();
  const before = levelForXp(s.xp);
  let xpGained = 0;

  switch (evt.type) {
    case "recipe": {
      s.totalRecipes += 1;
      s.today.recipes += 1;
      if (evt.ingredientCount >= 3) {
        s.totalMultiRecipes += 1;
        s.today.multiRecipes += 1;
      }
      if (evt.cookMinutes <= 20) s.today.fastRecipes += 1;
      xpGained += 10;
      break;
    }
    case "favorite": {
      s.favorites += 1;
      s.today.favorites += 1;
      xpGained += 5;
      break;
    }
    case "shoppingCheck": {
      s.shoppingChecks += 1;
      s.today.checks += 1;
      xpGained += 2;
      break;
    }
    case "profile": {
      s.profileSaved = true;
      s.today.profile = true;
      xpGained += 20;
      break;
    }
    case "roll": {
      s.rolls += 1;
      s.today.rolls += 1;
      xpGained += 5;
      break;
    }
    case "visit": {
      const today = todayKey();
      if (s.lastVisitDay !== today) {
        if (s.lastVisitDay === yesterdayKey()) {
          s.streak += 1;
        } else {
          s.streak = 1;
        }
        s.lastVisitDay = today;
        xpGained += 5;
      }
      break;
    }
  }

  s.xp += xpGained;

  // 업적 확인 (새로 달성한 것만)
  const newAchievements: TrackResult["newAchievements"] = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements.includes(a.id) && a.check(s)) {
      s.achievements.push(a.id);
      newAchievements.push({ id: a.id, icon: a.icon, title: a.title, desc: a.desc });
      s.xp += 20; // 업적 달성 보너스
      xpGained += 20;
    }
  }

  // 일일 미션 확인
  const completedMissions: TrackResult["completedMissions"] = [];
  for (const m of todaysMissions()) {
    if (!s.missions.done.includes(m.id) && m.check(s.today)) {
      s.missions.done.push(m.id);
      completedMissions.push({ id: m.id, icon: m.icon, title: m.title, xp: m.xp });
      s.xp += m.xp;
      xpGained += m.xp;
    }
  }

  save(s);

  const after = levelForXp(s.xp);
  const leveledUp = after > before;
  const result: TrackResult = {
    xpGained,
    leveledUp,
    newLevel: after,
    newTitle: titleForLevel(after),
    newAchievements,
    completedMissions,
  };

  // 전역 알림 (GameToast가 수신)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nv:game", { detail: result }));
  }
  return result;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

// ---------- 조회 ----------

export function getGameState(): GameStats {
  return load();
}

/** 식재료 도감에 사용자가 입력한 식재료를 기록한다 */
export function collectIngredients(raw: string): void {
  if (typeof window === "undefined") return;
  const names = raw
    .split(/[,，、\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const ko = translateToKorean(x);
      return lookupNutrition(ko)?.name ?? ko;
    });
  if (names.length === 0) return;
  const s = load();
  for (const n of names) {
    s.ingredients[n] = (s.ingredients[n] ?? 0) + 1;
  }
  save(s);
}
