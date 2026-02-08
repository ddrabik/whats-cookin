import { describe, expect, test } from "vitest";
import { formatQuantity, formatRelativeTime } from "./utils";

// =============================================================================
// formatQuantity
// =============================================================================
describe("formatQuantity", () => {
  describe("whole numbers", () => {
    test("formats whole number 1", () => {
      expect(formatQuantity(1)).toBe("1");
    });

    test("formats whole number 2", () => {
      expect(formatQuantity(2)).toBe("2");
    });

    test("formats whole number 10", () => {
      expect(formatQuantity(10)).toBe("10");
    });
  });

  describe("standalone fractions", () => {
    test("formats 0.5 as ½", () => {
      expect(formatQuantity(0.5)).toBe("½");
    });

    test("formats 0.25 as ¼", () => {
      expect(formatQuantity(0.25)).toBe("¼");
    });

    test("formats 0.75 as ¾", () => {
      expect(formatQuantity(0.75)).toBe("¾");
    });

    test("formats 0.125 as ⅛", () => {
      expect(formatQuantity(0.125)).toBe("⅛");
    });

    test("formats 0.333... as ⅓ (handles floating point)", () => {
      expect(formatQuantity(1 / 3)).toBe("⅓");
    });

    test("formats 0.666... as ⅔ (handles floating point)", () => {
      expect(formatQuantity(2 / 3)).toBe("⅔");
    });
  });

  describe("mixed numbers", () => {
    test("formats 1.5 as 1½", () => {
      expect(formatQuantity(1.5)).toBe("1½");
    });

    test("formats 2.25 as 2¼", () => {
      expect(formatQuantity(2.25)).toBe("2¼");
    });

    test("formats 2.75 as 2¾", () => {
      expect(formatQuantity(2.75)).toBe("2¾");
    });

    test("formats 1.333... as 1⅓ (handles floating point)", () => {
      expect(formatQuantity(1 + 1 / 3)).toBe("1⅓");
    });

    test("formats 3.875 as 3⅞", () => {
      expect(formatQuantity(3.875)).toBe("3⅞");
    });
  });

  describe("decimal fallback", () => {
    test("formats 0.6 as ⅗ (exact match)", () => {
      expect(formatQuantity(0.6)).toBe("⅗");
    });

    test("formats 1.7 as decimal (no exact fraction)", () => {
      expect(formatQuantity(1.7)).toBe("1.7");
    });

    test("formats 0.123 as decimal (no close fraction)", () => {
      // Not close enough to ⅛ (0.125) with our tolerance
      expect(formatQuantity(0.123)).toBe("0.123");
    });
  });

  describe("numeric inputs", () => {
    test("formats computed decimals correctly", () => {
      // Test that programmatically computed values work
      expect(formatQuantity(1.5)).toBe("1½");
      expect(formatQuantity(2.25)).toBe("2¼");
      expect(formatQuantity(0.5)).toBe("½");
    });
  });
});

describe("formatRelativeTime", () => {
  test("returns 'just now' for timestamps within last minute", () => {
    expect(formatRelativeTime(Date.now() - 30_000)).toBe("just now");
  });

  test("returns '2m ago' for 2 minutes ago", () => {
    expect(formatRelativeTime(Date.now() - 2 * 60 * 1000)).toBe("2m ago");
  });

  test("returns '1h ago' for 1 hour ago", () => {
    expect(formatRelativeTime(Date.now() - 60 * 60 * 1000)).toBe("1h ago");
  });

  test("returns '3d ago' for 3 days ago", () => {
    expect(formatRelativeTime(Date.now() - 3 * 24 * 60 * 60 * 1000)).toBe("3d ago");
  });

  test("returns '2w ago' for 2 weeks ago", () => {
    expect(formatRelativeTime(Date.now() - 14 * 24 * 60 * 60 * 1000)).toBe("2w ago");
  });
});
