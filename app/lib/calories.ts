/** 구성 값이 있을 때 열량을 덧셈식으로 보여 준다. 값이 하나뿐이면 식을 만들지 않는다. */

export type CaloriePart = {
  label?: string;
  calories: number;
};

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function caloriePartsOf(
  items: Array<{ label?: string; title?: string; name?: string; calories?: number | null }>
): CaloriePart[] {
  const parts: CaloriePart[] = [];
  for (const item of items) {
    if (!finite(item.calories)) continue;
    const label = item.label ?? item.title ?? item.name;
    parts.push({ label, calories: Math.round(item.calories) });
  }
  return parts;
}

/** 예: "320 + 180 = 500 kcal" */
export function formatCalorieSum(parts: CaloriePart[], unit = "kcal"): string | null {
  if (parts.length < 2) return null;
  const total = parts.reduce((sum, part) => sum + part.calories, 0);
  return `${parts.map((part) => String(part.calories)).join(" + ")} = ${total} ${unit}`;
}

/** 예: "김치찌개 320 + 계란말이 180 = 500 kcal" */
export function formatCalorieFormula(parts: CaloriePart[], unit = "kcal"): string | null {
  if (parts.length < 2) return null;
  const total = parts.reduce((sum, part) => sum + part.calories, 0);
  const expr = parts
    .map((part) => (part.label ? `${part.label} ${part.calories}` : String(part.calories)))
    .join(" + ");
  return `${expr} = ${total} ${unit}`;
}
