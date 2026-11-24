import type { MealSlot } from "./types";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];

export function mealSlotLabel(slot: MealSlot): string {
  switch (slot) {
    case "breakfast":
      return "아침";
    case "lunch":
      return "점심";
    case "dinner":
      return "저녁";
    default: {
      const never: never = slot;
      return never;
    }
  }
}
