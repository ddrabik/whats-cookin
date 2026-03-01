import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { buildHtmlFilename } from "./uploads/actions";
import { MAX_HTML_INPUT_CHARS, prepareHtmlForModel } from "./vision/actions";

const modules = import.meta.glob("./**/*.ts");

describe("URL import existing behavior", () => {
  test("buildHtmlFilename produces stable safe html filenames", () => {
    const filename = buildHtmlFilename(
      new URL("https://example.com/recipes/simple-breakfast?print=1")
    );

    expect(filename).toBe("example.com-simple-breakfast.html");
  });

  test("prepareHtmlForModel strips scripts/styles and enforces max length", () => {
    const largeHtml = `<html><head><style>.x{color:red}</style></head><body><script>alert(1)</script>${"x".repeat(
      MAX_HTML_INPUT_CHARS + 1000
    )}</body></html>`;

    const prepared = prepareHtmlForModel(largeHtml);

    expect(prepared).not.toContain("<script");
    expect(prepared).not.toContain("<style");
    expect(prepared.length).toBe(MAX_HTML_INPUT_CHARS);
  });

  test("manual recipe creation uses sourceUrl when upload has original URL", async () => {
    const t = convexTest(schema, modules);
    const sourceUrl = "https://example.com/recipes/classic-skillet-meal?print=1";

    const storageId = await t.run(async (ctx) => {
      return await ctx.storage.store(new Blob(["<html><body>Recipe</body></html>"], { type: "text/html" }));
    });

    const uploadId = await t.mutation(api.uploads.mutations.saveFileMetadata, {
      storageId,
      filename: "recipe.html",
      size: 32,
      contentType: "text/html",
      sourceUrl,
    });

    const now = Date.now();
    const analysisId = await t.run(async (ctx) => {
      return await ctx.db.insert("visionAnalysis", {
        uploadId,
        storageId,
        status: "completed",
        retryCount: 0,
        maxRetries: 3,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
        analysisResult: {
          rawText: "Classic Skillet Meal",
          description: "Recipe page",
          confidence: 0.95,
          contentType: "recipe",
          recipeData: {
            title: "Classic Skillet Meal",
            ingredients: ["1 cup flour", "1 egg"],
            instructions: ["Mix ingredients", "Cook on skillet"],
            cookTime: "15 minutes",
          },
        },
      });
    });

    const result = await t.mutation(api.recipePipeline.manuallyCreateRecipe, {
      analysisId,
    });

    expect(result.success).toBe(true);

    const analysis = await t.query(api.vision.queries.getAnalysis, { analysisId });
    expect(analysis?.recipeId).toBeDefined();

    const recipe = await t.query(api.recipes.get, {
      id: analysis!.recipeId!,
    });
    expect(recipe?.source).toBe(sourceUrl);
  });

  test("OCR trigger rejects html uploads", async () => {
    const t = convexTest(schema, modules);

    const storageId = await t.run(async (ctx) => {
      return await ctx.storage.store(new Blob(["<html></html>"], { type: "text/html" }));
    });
    const uploadId = await t.mutation(api.uploads.mutations.saveFileMetadata, {
      storageId,
      filename: "recipe.html",
      size: 13,
      contentType: "text/html",
    });

    await expect(
      t.mutation(api.vision.mutations.triggerAnalysis, { uploadId })
    ).rejects.toThrow("triggerAnalysis supports image uploads only");
  });

  test("HTML trigger rejects non-html uploads", async () => {
    const t = convexTest(schema, modules);

    const storageId = await t.run(async (ctx) => {
      return await ctx.storage.store(new Blob(["img"], { type: "image/png" }));
    });
    const uploadId = await t.mutation(api.uploads.mutations.saveFileMetadata, {
      storageId,
      filename: "recipe.png",
      size: 3,
      contentType: "image/png",
    });

    await expect(
      t.mutation(api.vision.mutations.triggerHtmlAnalysis, { uploadId })
    ).rejects.toThrow("triggerHtmlAnalysis supports text/html uploads only");
  });
});
