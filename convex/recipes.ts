import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireClerkUserId } from "./auth";

// Query to list all recipes with optional filtering
export const list = query({
  args: {
    mealType: v.optional(
      v.union(
        v.literal("breakfast"),
        v.literal("lunch"),
        v.literal("dinner"),
        v.literal("snack"),
        v.literal("dessert")
      )
    ),
    favoritesOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const limit = args.limit;

    if (args.mealType) {
      const recipesQuery = ctx.db
        .query("recipes")
        .withIndex("by_userId_mealType_createdAt", (q) =>
          q.eq("userId", userId).eq("mealType", args.mealType!)
        )
        .order("desc");

      const recipes = limit ? await recipesQuery.take(limit) : await recipesQuery.collect();
      return args.favoritesOnly ? recipes.filter((recipe) => recipe.isFavorite) : recipes;
    }

    if (args.favoritesOnly) {
      const recipesQuery = ctx.db
        .query("recipes")
        .withIndex("by_userId_isFavorite_createdAt", (q) =>
          q.eq("userId", userId).eq("isFavorite", true)
        )
        .order("desc");

      return limit ? recipesQuery.take(limit) : recipesQuery.collect();
    }

    const recipesQuery = ctx.db
      .query("recipes")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .order("desc");
    return limit ? recipesQuery.take(limit) : recipesQuery.collect();
  },
});

// Query to get a single recipe by ID
export const get = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const recipe = await ctx.db.get("recipes", args.id);
    if (!recipe || recipe.userId !== userId) {
      return null;
    }
    return recipe;
  },
});

// Query to get recent recipes
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("recipes")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

// Mutation to create a new recipe
export const create = mutation({
  args: {
    title: v.string(),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack"),
      v.literal("dessert")
    ),
    cookTime: v.string(),
    cookTimeMinutes: v.number(),
    isFavorite: v.optional(v.boolean()),
    author: v.optional(v.string()),
    source: v.optional(v.string()),
    imageUrl: v.string(),
    ingredients: v.array(
      v.object({
        quantity: v.number(),
        name: v.string(),
        unit: v.string(),
      })
    ),
    instructions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const recipeId = await ctx.db.insert("recipes", {
      userId,
      title: args.title,
      mealType: args.mealType,
      cookTime: args.cookTime,
      cookTimeMinutes: args.cookTimeMinutes,
      isFavorite: args.isFavorite ?? false,
      author: args.author,
      source: args.source,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
      ingredients: args.ingredients,
      instructions: args.instructions,
    });

    return recipeId;
  },
});

// Mutation to update a recipe
export const update = mutation({
  args: {
    id: v.id("recipes"),
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
    cookTime: v.optional(v.string()),
    cookTimeMinutes: v.optional(v.number()),
    isFavorite: v.optional(v.boolean()),
    author: v.optional(v.string()),
    source: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    ingredients: v.optional(
      v.array(
        v.object({
          quantity: v.number(),
          name: v.string(),
          unit: v.string(),
        })
      )
    ),
    instructions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const { id, ...updates } = args;
    const recipe = await ctx.db.get("recipes", id);
    if (!recipe) {
      throw new Error("Recipe not found");
    }
    if (recipe.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch("recipes", id, updates);
    return id;
  },
});

// Mutation to toggle favorite status
export const toggleFavorite = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const recipe = await ctx.db.get("recipes", args.id);
    if (!recipe) {
      throw new Error("Recipe not found");
    }
    if (recipe.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch("recipes", args.id, {
      isFavorite: !recipe.isFavorite,
    });

    return args.id;
  },
});

// Mutation to delete a recipe
export const remove = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const recipe = await ctx.db.get("recipes", args.id);
    if (!recipe) {
      throw new Error("Recipe not found");
    }
    if (recipe.userId !== userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.delete("recipes", args.id);
    return args.id;
  },
});

// Pure function for search matching — exported for unit testing
export function matchesSearchQuery(
  recipe: { title: string; mealType: string; ingredients: Array<{ name: string }> },
  searchQuery: string
): boolean {
  if (searchQuery === "") {
    return true;
  }
  const q = searchQuery.toLowerCase();
  if (recipe.title.toLowerCase().includes(q)) {
    return true;
  }
  if (recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(q))) {
    return true;
  }
  if (recipe.mealType.toLowerCase().includes(q)) {
    return true;
  }
  return false;
}

// Internal query for chat action to search recipes by text
export const searchInternal = internalQuery({
  args: {
    userId: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const allRecipes = await ctx.db
      .query("recipes")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", args.userId))
      .collect();
    return allRecipes.filter((recipe) => matchesSearchQuery(recipe, args.query));
  },
});

// Internal query for chat action to list recipes with optional filters
export const listInternal = internalQuery({
  args: {
    userId: v.string(),
    mealType: v.optional(
      v.union(
        v.literal("breakfast"),
        v.literal("lunch"),
        v.literal("dinner"),
        v.literal("snack"),
        v.literal("dessert")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.mealType) {
      const byMealType = ctx.db
        .query("recipes")
        .withIndex("by_userId_mealType_createdAt", (q) =>
          q.eq("userId", args.userId).eq("mealType", args.mealType!)
        )
        .order("desc");
      return args.limit ? byMealType.take(args.limit) : byMealType.collect();
    }

    const byUser = ctx.db
      .query("recipes")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", args.userId))
      .order("desc");
    return args.limit ? byUser.take(args.limit) : byUser.collect();
  },
});

// Internal query for chat action to get a single recipe
export const getInternal = internalQuery({
  args: {
    userId: v.string(),
    id: v.id("recipes"),
  },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get("recipes", args.id);
    if (!recipe || recipe.userId !== args.userId) {
      return null;
    }
    return recipe;
  },
});
