import type { UserProfile } from "./types";

/** BMI 및 기초대사량(BMR)·일일 권장 열량 추정 (참고용 계산, 의료적 판단 아님) */

export function calcBMI(heightCm: number, weightKg: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export type BmiBand = "under" | "normal" | "over" | "obese";

/** 대한비만학회 구간. 화면 문구는 로케일 파일이 담당하고, 진단이 아니다. */
export function bmiBand(bmi: number): BmiBand {
  if (bmi < 18.5) return "under";
  if (bmi < 23) return "normal";
  if (bmi < 25) return "over";
  return "obese";
}

/** 대한비만학회 기준 BMI 분류 (참고용). 기존 한국어 문구를 유지한다. */
export function bmiCategory(bmi: number): string {
  const band = bmiBand(bmi);
  switch (band) {
    case "under":
      return "저체중";
    case "normal":
      return "정상";
    case "over":
      return "과체중";
    case "obese":
      return "비만";
    default: {
      const never: never = band;
      return never;
    }
  }
}

type DailyCalorieEstimate = {
  bmr: number; // 기초대사량 (Mifflin-St Jeor)
  tdee: number; // 일일 총 에너지 소비량(추정)
  dailyCalories: number; // 일일 권장 열량(참고)
  label: string;
};

/** Mifflin-St Jeor 공식 기반 BMR 및 활동 계수 기반 일일 권장 열량 추정 */
export function estimateDailyCalories(
  profile: Pick<
    UserProfile,
    "gender" | "age" | "heightCm" | "weightKg" | "activityLevel"
  >
): DailyCalorieEstimate | null {
  const { gender, age, heightCm, weightKg, activityLevel } = profile;
  if (!gender || !age || !heightCm || !weightKg || !activityLevel) return null;

  let bmr: number;
  if (gender === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const factors: Record<string, number> = {
    low: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
    very_high: 1.9,
  };
  const factor = factors[activityLevel] ?? 1.2;

  const tdee = bmr * factor;

  const labels: Record<string, string> = {
    low: "거의 없음(운동 안 함)",
    light: "가벼운 활동(주 1~3회)",
    moderate: "보통 활동(주 3~5회)",
    high: "활발한 활동(주 6~7회)",
    very_high: "매우 활발함(고강도·육체노동)",
  };

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyCalories: Math.round(tdee),
    label: labels[activityLevel] ?? activityLevel,
  };
}

export function targetCalories(
  estimate: DailyCalorieEstimate,
  goal: "maintain" | "lose" | "gain"
): number {
  const base = estimate.dailyCalories;
  if (goal === "lose") return Math.round(base * 0.85);
  if (goal === "gain") return Math.round(base * 1.1);
  return base;
}
