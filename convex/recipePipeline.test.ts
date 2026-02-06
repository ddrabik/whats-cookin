import { describe, expect, test } from "vitest";
import {
  inferMealType,
  parseCookTime,
  parseIngredients,
  parseQuantity,
} from "./recipePipeline";

// =============================================================================
// parseQuantity
// =============================================================================
describe("parseQuantity", () => {
  // ── Already working cases (sanity checks) ──────────────────────────────
  describe("whole numbers and decimals", () => {
    test("parses whole number", () => {
      expect(parseQuantity("2")).toBe(2);
    });

    test("parses decimal", () => {
      expect(parseQuantity("1.5")).toBe(1.5);
    });

    test("parses text fraction", () => {
      expect(parseQuantity("1/2")).toBe(0.5);
    });

    test("parses text fraction 3/4", () => {
      expect(parseQuantity("3/4")).toBe(0.75);
    });
  });

  // ── Currently broken: Unicode fractions ─────────────────────────────────
  describe("unicode fractions", () => {
    test("parses ½ as 0.5", () => {
      expect(parseQuantity("½")).toBe(0.5);
    });

    test("parses ¼ as 0.25", () => {
      expect(parseQuantity("¼")).toBe(0.25);
    });

    test("parses ¾ as 0.75", () => {
      expect(parseQuantity("¾")).toBe(0.75);
    });

    test("parses ⅓ as 1/3", () => {
      expect(parseQuantity("⅓")).toBeCloseTo(1 / 3);
    });

    test("parses ⅔ as 2/3", () => {
      expect(parseQuantity("⅔")).toBeCloseTo(2 / 3);
    });

    test("parses ⅛ as 0.125", () => {
      expect(parseQuantity("⅛")).toBe(0.125);
    });
  });

  // ── Mixed numbers with unicode fractions ──────────────────────────────
  describe("mixed numbers with unicode fractions", () => {
    test("parses 1½ as 1.5", () => {
      expect(parseQuantity("1½")).toBe(1.5);
    });

    test("parses 2¾ as 2.75", () => {
      expect(parseQuantity("2¾")).toBe(2.75);
    });

    test("parses 1⅓ as ~1.333", () => {
      expect(parseQuantity("1⅓")).toBeCloseTo(1 + 1 / 3);
    });
  });

  // ── Mixed numbers with text fractions (space-separated) ─────────────────
  describe("mixed numbers with text fractions", () => {
    test("parses '1 1/2' as 1.5", () => {
      expect(parseQuantity("1 1/2")).toBe(1.5);
    });

    test("parses '2 3/4' as 2.75", () => {
      expect(parseQuantity("2 3/4")).toBe(2.75);
    });

    test("parses '1 1/3' as ~1.333", () => {
      expect(parseQuantity("1 1/3")).toBeCloseTo(1 + 1 / 3);
    });

    test("parses '3 1/8' as 3.125", () => {
      expect(parseQuantity("3 1/8")).toBe(3.125);
    });
  });
});

// =============================================================================
// parseIngredients
// =============================================================================
describe("parseIngredients", () => {
  // ── Already working cases ───────────────────────────────────────────────
  describe("standard formats", () => {
    test("parses '2 cups flour' without originalString", () => {
      const result = parseIngredients(["2 cups flour"]);
      expect(result).toEqual([{ quantity: 2, unit: "cups", name: "flour" }]);
      expect(result[0].originalString).toBeUndefined();
    });

    test("parses '3 eggs' (no unit) without originalString", () => {
      const result = parseIngredients(["3 eggs"]);
      expect(result).toEqual([{ quantity: 3, unit: "whole", name: "eggs" }]);
      expect(result[0].originalString).toBeUndefined();
    });

    test("falls back to whole string as name with originalString set", () => {
      const result = parseIngredients(["salt to taste"]);
      expect(result).toEqual([
        { quantity: 1, unit: "whole", name: "salt to taste", originalString: "salt to taste" },
      ]);
    });
  });

  // ── Currently broken: Unicode fractions in ingredients ──────────────────
  describe("unicode fractions in ingredient strings", () => {
    test("parses '½ cup flour'", () => {
      const result = parseIngredients(["½ cup flour"]);
      expect(result).toEqual([{ quantity: 0.5, unit: "cup", name: "flour" }]);
    });

    test("parses '¾ tsp salt'", () => {
      const result = parseIngredients(["¾ tsp salt"]);
      expect(result).toEqual([{ quantity: 0.75, unit: "tsp", name: "salt" }]);
    });

    test("parses '1 ½ tsp sugar' (space-separated mixed fraction)", () => {
      const result = parseIngredients(["1 ½ tsp sugar"]);
      expect(result).toEqual([
        { quantity: 1.5, unit: "tsp", name: "sugar" },
      ]);
    });

    test("parses '1½ cups milk' (no space mixed fraction)", () => {
      const result = parseIngredients(["1½ cups milk"]);
      expect(result).toEqual([
        { quantity: 1.5, unit: "cups", name: "milk" },
      ]);
    });

    test("parses '2 ¼ cups all-purpose flour'", () => {
      const result = parseIngredients(["2 ¼ cups all-purpose flour"]);
      expect(result).toEqual([
        { quantity: 2.25, unit: "cups", name: "all-purpose flour" },
      ]);
    });
  });

  // ── Multiple ingredients at once ────────────────────────────────────────
  describe("multiple ingredients", () => {
    test("parses a full ingredient list with unicode fractions", () => {
      const result = parseIngredients([
        "2 cups flour",
        "½ tsp salt",
        "1 ½ cups milk",
        "3 eggs",
      ]);
      expect(result).toEqual([
        { quantity: 2, unit: "cups", name: "flour" },
        { quantity: 0.5, unit: "tsp", name: "salt" },
        { quantity: 1.5, unit: "cups", name: "milk" },
        { quantity: 3, unit: "whole", name: "eggs" },
      ]);
    });

    test("parses ingredients with text fractions", () => {
      const result = parseIngredients([
        "1 1/2 cups flour",
        "2 3/4 tsp vanilla",
        "1/4 cup sugar",
      ]);
      expect(result).toEqual([
        { quantity: 1.5, unit: "cups", name: "flour" },
        { quantity: 2.75, unit: "tsp", name: "vanilla" },
        { quantity: 0.25, unit: "cup", name: "sugar" },
      ]);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────
  describe("edge cases", () => {
    test("handles empty array", () => {
      expect(parseIngredients([])).toEqual([]);
    });

    test("parses decimal quantity with unit", () => {
      const result = parseIngredients(["1.5 tbsp olive oil"]);
      expect(result).toEqual([
        { quantity: 1.5, unit: "tbsp", name: "olive oil" },
      ]);
    });

    test("parses text fraction with unit", () => {
      const result = parseIngredients(["1/4 cup sugar"]);
      expect(result).toEqual([
        { quantity: 0.25, unit: "cup", name: "sugar" },
      ]);
    });
  });

  // ── Non-standard measurements (pinch, dash, to taste) ───────────────────
  describe("cooking terminology", () => {
    test("parses '1 pinch salt' without originalString", () => {
      const result = parseIngredients(["1 pinch salt"]);
      expect(result).toEqual([
        { quantity: 1, unit: "pinch", name: "salt" },
      ]);
      expect(result[0].originalString).toBeUndefined();
    });

    test("parses '2 dashes pepper' without originalString", () => {
      const result = parseIngredients(["2 dashes pepper"]);
      expect(result).toEqual([
        { quantity: 2, unit: "dashes", name: "pepper" },
      ]);
      expect(result[0].originalString).toBeUndefined();
    });

    test("parses '1 handful spinach' without originalString", () => {
      const result = parseIngredients(["1 handful spinach"]);
      expect(result).toEqual([
        { quantity: 1, unit: "handful", name: "spinach" },
      ]);
      expect(result[0].originalString).toBeUndefined();
    });

    test("parses '3 cloves garlic' without originalString", () => {
      const result = parseIngredients(["3 cloves garlic"]);
      expect(result).toEqual([
        { quantity: 3, unit: "cloves", name: "garlic" },
      ]);
      expect(result[0].originalString).toBeUndefined();
    });

    test("sets originalString for 'salt to taste'", () => {
      const result = parseIngredients(["salt to taste"]);
      expect(result).toEqual([
        { quantity: 1, unit: "whole", name: "salt to taste", originalString: "salt to taste" },
      ]);
    });

    test("sets originalString for 'a pinch of salt'", () => {
      const result = parseIngredients(["a pinch of salt"]);
      expect(result).toEqual([
        { quantity: 1, unit: "whole", name: "a pinch of salt", originalString: "a pinch of salt" },
      ]);
    });

    test("sets originalString for 'pinch salt' (no number)", () => {
      const result = parseIngredients(["pinch salt"]);
      expect(result).toEqual([
        { quantity: 1, unit: "whole", name: "pinch salt", originalString: "pinch salt" },
      ]);
    });
  });
});


// =============================================================================
// parseCookTime
// =============================================================================
describe("parseCookTime", () => {
  describe("minutes", () => {
    test("parses '30 min'", () => {
      expect(parseCookTime("30 min")).toBe(30);
    });

    test("parses '45 minutes'", () => {
      expect(parseCookTime("45 minutes")).toBe(45);
    });

    test("parses '15m'", () => {
      expect(parseCookTime("15m")).toBe(15);
    });
  });

  describe("hours", () => {
    test("parses '1 hour'", () => {
      expect(parseCookTime("1 hour")).toBe(60);
    });

    test("parses '2 hr'", () => {
      expect(parseCookTime("2 hr")).toBe(120);
    });

    test("parses '1h'", () => {
      expect(parseCookTime("1h")).toBe(60);
    });
  });

  describe("combined hours and minutes", () => {
    test("parses '1h 30m'", () => {
      expect(parseCookTime("1h 30m")).toBe(90);
    });

    test("parses '1 hour 15 minutes'", () => {
      expect(parseCookTime("1 hour 15 minutes")).toBe(75);
    });

    test("parses '2 hr 45 min'", () => {
      expect(parseCookTime("2 hr 45 min")).toBe(165);
    });
  });

  describe("edge cases", () => {
    test("returns 0 for undefined", () => {
      expect(parseCookTime(undefined)).toBe(0);
    });

    test("returns 0 for empty string", () => {
      expect(parseCookTime("")).toBe(0);
    });

    test("extracts bare number as minutes", () => {
      expect(parseCookTime("30")).toBe(30);
    });

    test("is case insensitive", () => {
      expect(parseCookTime("30 MIN")).toBe(30);
      expect(parseCookTime("1 HOUR")).toBe(60);
    });
  });
});

// =============================================================================
// inferMealType
// =============================================================================
describe("inferMealType", () => {
  test("infers dessert from title keywords", () => {
    expect(inferMealType({ title: "Chocolate Cake" })).toBe("dessert");
    expect(inferMealType({ title: "Cookie Recipe" })).toBe("dessert");
    expect(inferMealType({ title: "Brownies" })).toBe("dessert");
  });

  test("infers breakfast from title keywords", () => {
    expect(inferMealType({ title: "Blueberry Pancakes" })).toBe("breakfast");
    expect(inferMealType({ title: "Scrambled Eggs" })).toBe("breakfast");
    expect(inferMealType({ title: "Classic Waffles" })).toBe("breakfast");
  });

  test("infers dinner from title keywords", () => {
    expect(inferMealType({ title: "Roast Chicken" })).toBe("dinner");
    expect(inferMealType({ title: "Grilled Steak" })).toBe("dinner");
    expect(inferMealType({ title: "Baked Ziti" })).toBe("dinner");
  });

  test("infers from ingredients when title has no keywords", () => {
    expect(
      inferMealType({ title: "Classic Recipe", ingredients: ["chocolate chips", "sugar"] })
    ).toBe("dessert");
  });

  test("returns null when unable to determine", () => {
    expect(inferMealType({ title: "Green Salad" })).toBeNull();
    expect(inferMealType({})).toBeNull();
  });
});
