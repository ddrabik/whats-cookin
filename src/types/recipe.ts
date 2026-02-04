/**
 * Recipe types for the meal planner application
 */
import type { Doc } from "../../convex/_generated/dataModel";

export type Recipe = Doc<"recipes">;

export interface Ingredient {
  quantity: number;
  name: string;
  unit: string;
}

export type MealTypeFilter = "all" | "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
