import {  clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type {ClassValue} from "clsx";

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

/**
 * Unicode fraction mappings for display
 */
const DECIMAL_TO_FRACTION: Record<number, string> = {
  0.5: "½",
  [1 / 3]: "⅓",
  [2 / 3]: "⅔",
  0.25: "¼",
  0.75: "¾",
  0.2: "⅕",
  0.4: "⅖",
  0.6: "⅗",
  0.8: "⅘",
  [1 / 6]: "⅙",
  [5 / 6]: "⅚",
  0.125: "⅛",
  0.375: "⅜",
  0.625: "⅝",
  0.875: "⅞",
};

/**
 * Format a decimal quantity as a user-friendly string with unicode fractions
 * Examples:
 *   0.5 → "½"
 *   1.5 → "1½"
 *   2.75 → "2¾"
 *   2 → "2"
 *
 * @param quantity Decimal quantity to format
 * @returns Formatted string with unicode fractions where possible
 */
export function formatQuantity(quantity: number): string {
  // Handle whole numbers
  if (Number.isInteger(quantity)) {
    return quantity.toString();
  }

  const wholePart = Math.floor(quantity);
  const fractionalPart = quantity - wholePart;

  // Try exact match first
  const exactFraction = DECIMAL_TO_FRACTION[fractionalPart];
  if (exactFraction) {
    return wholePart > 0 ? `${wholePart}${exactFraction}` : exactFraction;
  }

  // Handle floating point imprecision (e.g., 0.333333333 → ⅓)
  const tolerance = 0.001;
  for (const [decimalStr, fractionChar] of Object.entries(DECIMAL_TO_FRACTION)) {
    const decimal = Number(decimalStr);
    if (Math.abs(fractionalPart - decimal) < tolerance) {
      return wholePart > 0 ? `${wholePart}${fractionChar}` : fractionChar;
    }
  }

  // Fallback to decimal
  return quantity.toString();
}
