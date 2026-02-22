import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Confidence threshold for automatic recipe creation
 * Only analyses with confidence >= 0.8 will be automatically converted
 */
const RECIPE_CREATION_THRESHOLD = 0.8;

/**
 * Backfill recipes from existing completed vision analyses
 * This is an additive-only operation that:
 * - Finds all completed analyses with confidence >= 0.8
 * - Skips analyses already linked to recipes
 * - Creates new recipes for unprocessed analyses
 * - Never deletes or modifies existing recipes
 *
 * Run from Convex dashboard or CLI:
 * npx convex run recipePipeline:backfillRecipes
 */
export const backfillRecipes = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all completed analyses
    const allAnalyses = await ctx.db
      .query("visionAnalysis")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();

    // Filter for high-confidence analyses that haven't been processed yet
    const eligibleAnalyses = [];
    const diagnostics = {
      noAnalysisResult: 0,
      lowConfidence: 0,
      noRecipeData: 0,
      recipeStillExists: 0,
      orphanedRecipeIds: 0,
    };

    for (const analysis of allAnalyses) {
      // Skip if no analysis result
      if (!analysis.analysisResult) {
        diagnostics.noAnalysisResult++;
        continue;
      }

      // Check confidence threshold
      if (analysis.analysisResult.confidence < RECIPE_CREATION_THRESHOLD) {
        diagnostics.lowConfidence++;
        continue;
      }

      // Skip if no recipe data
      if (!analysis.analysisResult.recipeData) {
        diagnostics.noRecipeData++;
        continue;
      }

      // If has recipeId, check if recipe still exists
      if (analysis.recipeId) {
        const recipe = await ctx.db.get("recipes", analysis.recipeId);
        if (recipe) {
          // Recipe still exists, skip this analysis
          diagnostics.recipeStillExists++;
          continue;
        }
        // Recipe was deleted, mark as orphaned
        diagnostics.orphanedRecipeIds++;
      }

      eligibleAnalyses.push(analysis);
    }

    const results = {
      total: allAnalyses.length,
      eligible: eligibleAnalyses.length,
      processed: 0,
      skipped: 0,
      errors: [] as Array<{ analysisId: string; error: string }>,
      recipeIds: [] as Array<string>,
      diagnostics,
    };

    // Process each eligible analysis
    for (const analysis of eligibleAnalyses) {
      try {
        // Create recipe from analysis
        const recipeId = await buildRecipeFromAnalysis(ctx, analysis);

        // Mark analysis as processed
        await ctx.db.patch("visionAnalysis", analysis._id, {
          recipeId,
          recipeCreatedAt: Date.now(),
        });

        results.processed++;
        results.recipeIds.push(recipeId);
      } catch (error) {
        results.errors.push({
          analysisId: analysis._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        results.skipped++;
      }
    }

    return results;
  },
});

/**
 * Default image URL when analysis doesn't have an uploaded image
 */
const DEFAULT_RECIPE_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";

/**
 * Internal mutation to automatically process completed vision analyses
 * Called after analysis completes with high confidence
 */
export const processCompletedAnalysis = internalMutation({
  args: {
    analysisId: v.id("visionAnalysis"),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get("visionAnalysis", args.analysisId);
    if (!analysis) {
      throw new Error("Analysis not found");
    }

    // Skip if already processed
    if (analysis.recipeId) {
      return { skipped: true, reason: "Already processed", recipeId: analysis.recipeId };
    }

    // Skip if not completed
    if (analysis.status !== "completed") {
      return { skipped: true, reason: "Analysis not completed" };
    }

    // Skip if no analysis result
    if (!analysis.analysisResult) {
      return { skipped: true, reason: "No analysis result" };
    }

    // Check confidence threshold
    if (analysis.analysisResult.confidence < RECIPE_CREATION_THRESHOLD) {
      return {
        skipped: true,
        reason: `Confidence ${analysis.analysisResult.confidence} below threshold ${RECIPE_CREATION_THRESHOLD}`,
      };
    }

    // Skip if no recipe data
    if (!analysis.analysisResult.recipeData) {
      return { skipped: true, reason: "No recipe data in analysis" };
    }

    // Create recipe from analysis
    const recipeId = await buildRecipeFromAnalysis(ctx, analysis);

    // Mark analysis as processed
    await ctx.db.patch("visionAnalysis", args.analysisId, {
      recipeId,
      recipeCreatedAt: Date.now(),
    });

    return { success: true, recipeId };
  },
});

/**
 * Manual mutation to create a recipe from a vision analysis
 * Can be called by users to manually convert lower-confidence analyses
 */
export const manuallyCreateRecipe = mutation({
  args: {
    analysisId: v.id("visionAnalysis"),
    overrides: v.optional(
      v.object({
        title: v.optional(v.string()),
        mealType: v.optional(
          v.union(
            v.literal("breakfast"),
            v.literal("lunch"),
            v.literal("dinner"),
            v.literal("snack"),
            v.literal("dessert")
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get("visionAnalysis", args.analysisId);
    if (!analysis) {
      throw new Error("Analysis not found");
    }

    // Check if already processed
    if (analysis.recipeId) {
      return { exists: true, recipeId: analysis.recipeId };
    }

    // Verify analysis has recipe data
    if (!analysis.analysisResult?.recipeData) {
      throw new Error("Analysis does not contain recipe data");
    }

    // Create recipe
    const recipeId = await buildRecipeFromAnalysis(ctx, analysis, args.overrides);

    // Mark analysis as processed
    await ctx.db.patch("visionAnalysis", args.analysisId, {
      recipeId,
      recipeCreatedAt: Date.now(),
    });

    return { success: true, recipeId };
  },
});

/**
 * Helper function to create a recipe from vision analysis
 */
async function buildRecipeFromAnalysis(
  ctx: { db: any; storage: any },
  analysis: any,
  overrides?: { title?: string; mealType?: string }
): Promise<Id<"recipes">> {
  const recipeData = analysis.analysisResult.recipeData;

  // Debug logging
  console.log("Building recipe from analysis:", {
    hasRecipeData: !!recipeData,
    hasInstructions: !!recipeData?.instructions,
    instructionsType: typeof recipeData?.instructions,
    instructionsLength: recipeData?.instructions?.length,
    instructionsPreview: recipeData?.instructions?.slice(0, 1),
  });

  // Get image URL from storage
  let imageUrl = DEFAULT_RECIPE_IMAGE;
  try {
    const storageUrl = await ctx.storage.getUrl(analysis.storageId);
    if (storageUrl) {
      imageUrl = storageUrl;
    }
  } catch (error) {
    console.warn("Failed to get storage URL, using default image", error);
  }

  // Parse cook time to extract minutes
  const cookTimeMinutes = parseCookTime(recipeData.cookTime);

  // Parse ingredients from strings to structured format
  const ingredients = parseIngredients(recipeData.ingredients ?? []);

  // Extract instructions (handle both array and undefined cases)
  const instructions = recipeData.instructions && Array.isArray(recipeData.instructions) && recipeData.instructions.length > 0
    ? recipeData.instructions
    : undefined;

  // Determine meal type (use override or try to infer, default to lunch)
  const mealType = overrides?.mealType ?? inferMealType(recipeData) ?? "lunch";

  // Preserve original website URL for URL imports when available.
  const upload = await ctx.db.get("unauthenticatedUploads", analysis.uploadId);
  const source = upload?.sourceUrl ?? "Vision Analysis";

  // Create the recipe
  const recipeId = await ctx.db.insert("recipes", {
    title: overrides?.title ?? recipeData.title ?? "Untitled Recipe",
    mealType,
    cookTime: recipeData.cookTime ?? "Unknown",
    cookTimeMinutes,
    isFavorite: false,
    source,
    imageUrl,
    createdAt: Date.now(),
    ingredients,
    instructions,
  });

  return recipeId;
}

/**
 * Parse cook time string to extract minutes
 * Examples: "30 min", "1 hour", "1h 30m", "45 minutes"
 */
export function parseCookTime(cookTime?: string): number {
  if (!cookTime) return 0;

  const lower = cookTime.toLowerCase();
  let totalMinutes = 0;

  // Match hours
  const hourMatch = lower.match(/(\d+)\s*(?:hour|hr|h)/);
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60;
  }

  // Match minutes
  const minuteMatch = lower.match(/(\d+)\s*(?:minute|min|m)/);
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1]);
  }

  // If no patterns matched, try to extract any number
  if (totalMinutes === 0) {
    const numberMatch = lower.match(/(\d+)/);
    if (numberMatch) {
      totalMinutes = parseInt(numberMatch[1]);
    }
  }

  return totalMinutes;
}

/**
 * Unicode character class for matching vulgar fraction characters in regex patterns.
 *
 * Covers ALL Unicode vulgar fractions:
 * - U+00BC-U+00BE: ¼ ½ ¾ (Latin-1 Supplement)
 * - U+2150-U+215F: ⅐ ⅑ ⅒ ⅓ ⅔ ⅕ ⅖ ⅗ ⅘ ⅙ ⅚ ⅛ ⅜ ⅝ ⅞ ⅟ (Number Forms)
 *
 * This is more robust than a hardcoded character list because:
 * 1. It covers ALL vulgar fractions defined in Unicode
 * 2. Uses standard Unicode ranges that are well-documented
 * 3. No decimal values to maintain (parseQuantity uses NFKD normalization)
 */
const UNICODE_FRACTION_CLASS = "\\u00BC-\\u00BE\\u2150-\\u215F";

/** Pattern matching a quantity: digits/decimals/slashes, unicode fractions, or mixed */
const QTY = `[\\d/.]*[${UNICODE_FRACTION_CLASS}]|[\\d/.]+`;

/**
 * Parse ingredient strings into structured format
 * Attempts basic parsing of "quantity unit name" format
 * Supports unicode fractions (½, ¼, ¾) and mixed numbers (1 ½, 1½)
 *
 * @returns Array of ingredient objects. If parsing fails, originalString is set
 *          to preserve the unparsed text for display (e.g., "salt to taste")
 */
export function parseIngredients(
  ingredientStrings: Array<string>
): Array<{ quantity: number; name: string; unit: string; originalString?: string }> {
  // Build regexes once using the quantity pattern
  // "2 cups flour", "½ cup flour", "1 ½ cups flour", "1½ cups milk"
  const withUnit = new RegExp(`^((?:${QTY})(?:\\s+(?:${QTY}))?)\\s+(\\w+)\\s+(.+)$`);
  // "2 eggs", "½ egg"
  const noUnit = new RegExp(`^((?:${QTY})(?:\\s+(?:${QTY}))?)\\s+(.+)$`);

  return ingredientStrings.map((str) => {
    // Try to parse "2 cups flour" or "½ tsp salt" format
    const match = str.match(withUnit);
    if (match) {
      return {
        quantity: parseQuantity(match[1]),
        unit: match[2],
        name: match[3],
      };
    }

    // Try "2 eggs" format (no unit)
    const simpleMatch = str.match(noUnit);
    if (simpleMatch) {
      return {
        quantity: parseQuantity(simpleMatch[1]),
        unit: "whole",
        name: simpleMatch[2],
      };
    }

    // Fallback: just use the whole string as name
    // Set originalString to indicate this should be displayed as-is
    return {
      quantity: 1,
      unit: "whole",
      name: str,
      originalString: str,
    };
  });
}

/**
 * Parse quantity string to number using Unicode normalization
 * Handles text fractions ("1/2"), decimals ("1.5"), unicode fractions ("½"),
 * and mixed numbers ("1½", "1 ½", "1 1/2")
 *
 * Uses NFKD normalization to decompose unicode fractions into parseable components:
 * - '½' → '1⁄2' (U+2044 fraction slash)
 * - '1½' → '11⁄2' (no space, handled by regex)
 * - '⅓' → '1⁄3', etc.
 *
 * This eliminates the need for a hardcoded unicode fraction mapping in parsing logic.
 */
export function parseQuantity(str: string): number {
  const trimmed = str.trim();

  // Normalize unicode fractions to decomposed form
  // '½' → '1⁄2' (U+2044 fraction slash)
  // '1½' → '11⁄2' (digits concatenated, no space)
  const normalized = trimmed.normalize("NFKD");

  // Insert space before fraction slash in mixed numbers
  // Pattern: digit followed by (digit + fraction slash)
  // '11⁄2' → '1 1⁄2'
  // '1⁄2' → '1⁄2' (no change, simple fraction)
  const withSpace = normalized.replace(/(\d)(\d\u2044)/g, "$1 $2");

  // Replace Unicode fraction slash (U+2044) with regular slash (U+002F)
  // '1⁄2' → '1/2'
  const withRegularSlash = withSpace.replace(/\u2044/g, "/");

  // Handle fractions (e.g. "1/2", "1 1/2")
  if (withRegularSlash.includes("/")) {
    // Check for mixed number format: "1 1/2" (whole space fraction)
    const mixedMatch = withRegularSlash.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseFloat(mixedMatch[1]);
      const numerator = parseFloat(mixedMatch[2]);
      const denominator = parseFloat(mixedMatch[3]);
      return whole + numerator / denominator;
    }

    // Simple fraction: "1/2"
    const [numerator, denominator] = withRegularSlash.split("/");
    return parseFloat(numerator) / parseFloat(denominator);
  }

  // Regular number or decimal
  return parseFloat(withRegularSlash);
}

/**
 * Attempt to infer meal type from recipe data
 * Returns null if unable to determine
 */
export function inferMealType(recipeData: {
  title?: string;
  ingredients?: Array<string>;
}): "breakfast" | "lunch" | "dinner" | "snack" | "dessert" | null {
  const text = [recipeData.title ?? "", ...(recipeData.ingredients ?? [])].join(" ").toLowerCase();

  // Check for breakfast keywords first (before dessert, because "pancake" contains "cake")
  if (
    text.includes("pancake") ||
    text.includes("waffle") ||
    text.includes("breakfast") ||
    text.includes("toast") ||
    text.includes("egg") ||
    text.includes("cereal") ||
    text.includes("oatmeal")
  ) {
    return "breakfast";
  }

  // Check for dessert keywords
  if (
    text.includes("cake") ||
    text.includes("cookie") ||
    text.includes("brownie") ||
    text.includes("dessert") ||
    text.includes("chocolate") ||
    text.includes("sweet")
  ) {
    return "dessert";
  }

  // Check for dinner keywords
  if (
    text.includes("dinner") ||
    text.includes("steak") ||
    text.includes("roast") ||
    text.includes("baked") ||
    text.includes("casserole")
  ) {
    return "dinner";
  }

  // Default to null (caller should provide default)
  return null;
}
