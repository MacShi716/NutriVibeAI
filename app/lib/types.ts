export type RecipeIngredient = {
  name: string;
  amount: string;
};

export type RecipeStep = string;

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
};

export type GenerateResult = {
  conditions: UserConditions;
  recipes: Recipe[];
  warnings: string[];
  usedMock: boolean;
  provider?: "groq" | "gemini" | "mock"; // 실제 사용된 LLM 제공방 (선택)
  generatedAt: string;
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
  updatedAt: string;
};
