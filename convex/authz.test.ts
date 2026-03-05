import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("Recipe authorization", () => {
  test("unauthenticated recipe list is rejected", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.recipes.list, {})).rejects.toThrow("Not authenticated");
  });

  test("recipes are scoped per user", async () => {
    const userA = convexTest(schema, modules).withIdentity({ subject: "user_a" });
    const userB = convexTest(schema, modules).withIdentity({ subject: "user_b" });

    await userA.mutation(api.recipes.create, {
      title: "A Recipe",
      mealType: "dinner",
      cookTime: "20 min",
      cookTimeMinutes: 20,
      imageUrl: "https://example.com/a.jpg",
      ingredients: [{ quantity: 1, unit: "cup", name: "rice" }],
    });
    await userB.mutation(api.recipes.create, {
      title: "B Recipe",
      mealType: "dinner",
      cookTime: "10 min",
      cookTimeMinutes: 10,
      imageUrl: "https://example.com/b.jpg",
      ingredients: [{ quantity: 1, unit: "cup", name: "beans" }],
    });

    const recipesA = await userA.query(api.recipes.list, {});
    const recipesB = await userB.query(api.recipes.list, {});

    expect(recipesA).toHaveLength(1);
    expect(recipesA[0]?.title).toBe("A Recipe");
    expect(recipesB).toHaveLength(1);
    expect(recipesB[0]?.title).toBe("B Recipe");
  });
});

describe("Thread/message authorization", () => {
  test("cross-user send is denied", async () => {
    const userA = convexTest(schema, modules).withIdentity({ subject: "user_a" });
    const userB = convexTest(schema, modules).withIdentity({ subject: "user_b" });

    const threadId = await userA.mutation(api.threads.create, { title: "A thread" });

    await expect(
      userB.mutation(api.messages.send, {
        threadId,
        content: "attempt",
      })
    ).rejects.toThrow("Not authorized");
  });
});

describe("Recipe pipeline authorization", () => {
  test("unauthenticated manuallyCreateRecipe is rejected", async () => {
    const owner = convexTest(schema, modules).withIdentity({ subject: "user_a" });
    const unauthenticated = convexTest(schema, modules);

    const analysisId = await owner.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["a"], { type: "image/jpeg" }));
      const uploadId = await ctx.db.insert("unauthenticatedUploads", {
        userId: "user_a",
        storageId,
        filename: "a.jpg",
        size: 100,
        contentType: "image/jpeg",
        uploadDate: Date.now(),
      });

      const now = Date.now();
      return ctx.db.insert("visionAnalysis", {
        userId: "user_a",
        uploadId,
        storageId,
        status: "completed",
        analysisResult: {
          rawText: "test",
          description: "test",
          confidence: 0.9,
          contentType: "recipe",
          recipeData: {
            title: "Owner Recipe",
            ingredients: ["1 cup rice"],
            instructions: ["Cook rice"],
            cookTime: "20 min",
          },
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(
      unauthenticated.mutation(api.recipePipeline.manuallyCreateRecipe, { analysisId })
    ).rejects.toThrow("Not authenticated");
  });

  test("cross-user manuallyCreateRecipe is rejected", async () => {
    const owner = convexTest(schema, modules).withIdentity({ subject: "user_a" });
    const otherUser = convexTest(schema, modules).withIdentity({ subject: "user_b" });

    const analysisId = await owner.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["a"], { type: "image/jpeg" }));
      const uploadId = await ctx.db.insert("unauthenticatedUploads", {
        userId: "user_a",
        storageId,
        filename: "a.jpg",
        size: 100,
        contentType: "image/jpeg",
        uploadDate: Date.now(),
      });

      const now = Date.now();
      return ctx.db.insert("visionAnalysis", {
        userId: "user_a",
        uploadId,
        storageId,
        status: "completed",
        analysisResult: {
          rawText: "test",
          description: "test",
          confidence: 0.9,
          contentType: "recipe",
          recipeData: {
            title: "Owner Recipe",
            ingredients: ["1 cup rice"],
            instructions: ["Cook rice"],
            cookTime: "20 min",
          },
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(
      otherUser.mutation(api.recipePipeline.manuallyCreateRecipe, { analysisId })
    ).rejects.toThrow("Not authorized");
  });

  test("owner can manuallyCreateRecipe successfully", async () => {
    const owner = convexTest(schema, modules).withIdentity({ subject: "user_a" });

    const analysisId = await owner.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["a"], { type: "image/jpeg" }));
      const uploadId = await ctx.db.insert("unauthenticatedUploads", {
        userId: "user_a",
        storageId,
        filename: "a.jpg",
        size: 100,
        contentType: "image/jpeg",
        uploadDate: Date.now(),
      });

      const now = Date.now();
      return ctx.db.insert("visionAnalysis", {
        userId: "user_a",
        uploadId,
        storageId,
        status: "completed",
        analysisResult: {
          rawText: "test",
          description: "test",
          confidence: 0.9,
          contentType: "recipe",
          recipeData: {
            title: "Owner Recipe",
            ingredients: ["1 cup rice"],
            instructions: ["Cook rice"],
            cookTime: "20 min",
          },
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await owner.mutation(api.recipePipeline.manuallyCreateRecipe, { analysisId });
    expect(result.success).toBe(true);
    expect(result.recipeId).toBeDefined();
  });
});
