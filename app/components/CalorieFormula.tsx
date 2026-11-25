"use client";

import { formatCalorieFormula, formatCalorieSum, type CaloriePart } from "@/lib/calories";

export default function CalorieFormula({
  parts,
  withLabels = true,
  className = "text-xs text-gray-500",
}: {
  parts: CaloriePart[];
  withLabels?: boolean;
  className?: string;
}) {
  const text = withLabels ? formatCalorieFormula(parts) : formatCalorieSum(parts);
  if (!text) return null;
  return (
    <p className={className} data-testid="calorie-formula">
      {text}
    </p>
  );
}
