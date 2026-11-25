export type RecipeIngredient = {
  name: string;
  amount: string;
};

type RecipeStep = string;

export type Recipe = {
  id: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  cookMinutes: number;
  servings: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    note?: string;
    goalPct?: number | null; // 목표 열량 대비 비율 (%)
  };
};

export type UserConditions = {
  ingredients: string; // 보유 식재료 (쉼표 구분)
  preferences: string; // 식습관·선호
  restrictions: string; // 기피·알레르기 (쉼표 구분)
  servings: number; // 식사 인원
  cookMinutes: number; // 조리 시간 (분)
  goalCalories?: number | null; // 프로필 기반 목표 열량 (선택, 참고용)
  goalProtein?: number | null; // 하루 단백질 목표(g), 선택
  prioritizeExpiring?: boolean; // 유통기한이 가까운 재료를 먼저 쓰도록 생성
  /** UI language used when generating; ko if omitted (older saved results). */
  locale?: "ko" | "zh" | "en";
};

export type GenerateResult = {
  conditions: UserConditions;
  recipes: Recipe[];
  warnings: string[];
  usedMock: boolean;
  provider?: "zhipu" | "mock"; // 실제 사용된 LLM 제공방 (선택)
  generatedAt: string;
  locale?: "ko" | "zh" | "en";
};

/** 사용자 개인 신체 프로필 (localStorage 저장, 참고용) */
export type UserProfile = {
  heightCm: number | null; // 키(cm)
  weightKg: number | null; // 몸무게(kg)
  bodyFatPct: number | null; // 체지방률(%), 선택 입력
  gender: "male" | "female" | null;
  age: number | null;
  activityLevel:
    | "low" // 거의 없음(운동 안 함)
    | "light" // 가벼운 활동(주 1~3회)
    | "moderate" // 보통(주 3~5회)
    | "high" // 활발함(주 6~7회)
    | "very_high" // 매우 활발함(고강도·육체노동)
    | null;
  proteinGoalG: number | null; // 하루 단백질 목표(g), 선택
  updatedAt: string;
};

export type MealSlot = "breakfast" | "lunch" | "dinner";

export type PlannedMeal = {
  slot: MealSlot;
  recipe: Recipe | null;
  pinned: boolean;
};

export type DayPlan = {
  date: string; // YYYY-MM-DD
  meals: PlannedMeal[];
};

export type WeeklyPlan = {
  startDate: string;
  days: DayPlan[];
  conditions: UserConditions;
  warnings: string[];
  usedMock: boolean;
  provider?: "zhipu" | "mock";
  generatedAt: string;
  locale?: "ko" | "zh" | "en";
};

/** 보유 식재료의 구매일·유통기한 (없으면 null) */
export type PantryItem = {
  name: string;
  amount?: string | null; // 보유량(선택). 재료 이름과 따로 두어 추천 매칭을 건드리지 않는다.
  purchasedOn: string | null; // YYYY-MM-DD
  expiresOn: string | null; // YYYY-MM-DD
};

/** 오늘 담은 레시피 1인분 영양 (진행 막대용) */
export type DailyEntry = {
  id: string;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
  /** 기록할 때 입력한 인분. 없으면 과거에 담은 항목으로 보고 1인분으로 표시한다. */
  servingsLogged?: number;
};

/** 사용자가 직접 등록하는 영양제. 기본 목록은 비어 있다. */
export type SupplementItem = {
  id: string;
  name: string;
  doseLabel: string;
  dailyCount: number;
  reminderTime: string | null; // HH:MM, 선택
  updatedAt: string;
};

export type SupplementLog = {
  date: string; // YYYY-MM-DD
  taken: Record<string, number>;
};

/** 앱을 연 동안만 동작하는 로컬 알림. 기본값은 모두 꺼짐. */
export type ReminderSettings = {
  veggieLunch: boolean;
  veggieDinner: boolean;
  grocery: boolean;
  notify: boolean;
  updatedAt: string;
};

export type DailyLog = {
  date: string;
  entries: DailyEntry[];
};
