import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

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
    // Fetch all recipes (or use an index for the most common filter)
    const allRecipes = await ctx.db.query("recipes").collect();

    // Apply filters in JavaScript
    let filtered = allRecipes;

    if (args.mealType) {
      filtered = filtered.filter((recipe) => recipe.mealType === args.mealType);
    }

    if (args.favoritesOnly) {
      filtered = filtered.filter((recipe) => recipe.isFavorite === true);
    }

    // Apply limit if specified
    if (args.limit) {
      return filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

// Query to get a single recipe by ID
export const get = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    return await ctx.db.get("recipes", args.id);
  },
});

// Query to get recent recipes
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("recipes")
      .withIndex("by_createdAt")
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
    const recipeId = await ctx.db.insert("recipes", {
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
    const { id, ...updates } = args;

    await ctx.db.patch("recipes", id, updates);
    return id;
  },
});

// Mutation to toggle favorite status
export const toggleFavorite = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get("recipes", args.id);
    if (!recipe) {
      throw new Error("Recipe not found");
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
    await ctx.db.delete("recipes", args.id);
    return args.id;
  },
});

// Pure function for search matching — exported for unit testing
export function matchesSearchQuery(
  recipe: { title: string; mealType: string; ingredients: Array<{ name: string }> },
  query: string
): boolean {
  if (query === "") {
    return true;
  }
  const q = query.toLowerCase();
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
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const allRecipes = await ctx.db.query("recipes").collect();
    return allRecipes.filter((recipe) => matchesSearchQuery(recipe, args.query));
  },
});

