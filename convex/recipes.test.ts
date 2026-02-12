import { describe, expect, test } from "vitest";
import { matchesSearchQuery } from "./recipes";

describe("matchesSearchQuery", () => {
  const makeRecipe = (overrides: Partial<{
    title: string;
    mealType: string;
    ingredients: Array<{ quantity: number; name: string; unit: string }>;
  }> = {}) => ({
    title: overrides.title ?? "Test Recipe",
    mealType: overrides.mealType ?? "dinner",
    ingredients: overrides.ingredients ?? [],
  });

  test("matches recipe title case-insensitively", () => {
    expect(matchesSearchQuery(makeRecipe({ title: "Pasta Carbonara" }), "pasta")).toBe(true);
  });

  test("matches partial title", () => {
    expect(matchesSearchQuery(makeRecipe({ title: "Pasta Carbonara" }), "carb")).toBe(true);
  });

  test("matches ingredient name", () => {
    const recipe = makeRecipe({
      ingredients: [{ quantity: 1, name: "chicken breast", unit: "lb" }],
    });
    expect(matchesSearchQuery(recipe, "chicken")).toBe(true);
  });

  test("matches meal type", () => {
    expect(matchesSearchQuery(makeRecipe({ mealType: "breakfast" }), "breakfast")).toBe(true);
  });

  test("returns false when nothing matches", () => {
    expect(matchesSearchQuery(makeRecipe({ title: "Pasta" }), "sushi")).toBe(false);
  });

  test("handles empty query string", () => {
    expect(matchesSearchQuery(makeRecipe(), "")).toBe(true);
  });

  test("handles recipe with no ingredients gracefully", () => {
    expect(matchesSearchQuery(makeRecipe({ ingredients: [] }), "chicken")).toBe(false);
  });
});
