import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),

  // Unauthenticated file uploads (temporary storage before auth is implemented)
  unauthenticatedUploads: defineTable({
    // Storage ID reference to Convex's internal _storage table
    storageId: v.id("_storage"),
    // Original filename from client
    filename: v.string(),
    // File size in bytes
    size: v.number(),
    // MIME type (e.g., image/jpeg, image/png)
    contentType: v.string(),
    // Upload timestamp
    uploadDate: v.number(),
    // Optional: Client user agent for tracking
    uploadSource: v.optional(v.string()),
    // Optional: Original recipe URL when imported from website
    sourceUrl: v.optional(v.string()),
  })
    .index("by_storageId", ["storageId"])
    .index("by_uploadDate", ["uploadDate"])
    .index("by_contentType", ["contentType"]),

  // Recipes table
  recipes: defineTable({
    // Basic recipe info
    title: v.string(),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack"),
      v.literal("dessert")
    ),
    cookTime: v.string(), // Human-readable format like "25 min"
    cookTimeMinutes: v.number(), // For sorting/filtering
    isFavorite: v.boolean(),

    // Attribution (at least one should be present)
    author: v.optional(v.string()),
    source: v.optional(v.string()),

    // Image
    imageUrl: v.string(),

    // Timestamps
    createdAt: v.number(), // Unix timestamp in milliseconds

    // Ingredients array
    ingredients: v.array(
      v.object({
        quantity: v.number(),
        name: v.string(),
        unit: v.string(),
        // Original unparsed string - only present when parsing falls back
        // Used to display natural language like "salt to taste" as-is
        originalString: v.optional(v.string()),
      })
    ),

    // Cooking instructions (optional, step-by-step)
    instructions: v.optional(v.array(v.string())),
  })
    .index("by_mealType", ["mealType"])
    .index("by_createdAt", ["createdAt"])
    .index("by_cookTimeMinutes", ["cookTimeMinutes"])
    .index("by_isFavorite", ["isFavorite"]),

  // Vision analysis results for uploaded files
  visionAnalysis: defineTable({
    // Reference to the upload that was analyzed
    uploadId: v.id("unauthenticatedUploads"),
    // Reference to storage for direct access
    storageId: v.id("_storage"),
    // Analysis status
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    // The extracted content/analysis from OpenAI
    analysisResult: v.optional(
      v.object({
        // Always present
        rawText: v.string(), // Full OCR text extraction
        description: v.string(), // Brief description of content
        confidence: v.number(), // 0-1 parsing confidence
        contentType: v.string(), // "recipe", "ingredient_list", "other"

        // Only present if confidence >= 0.7 (successful parsing)
        recipeData: v.optional(
          v.object({
            title: v.optional(v.string()),
            ingredients: v.optional(v.array(v.string())),
            instructions: v.optional(v.array(v.string())),
            servings: v.optional(v.string()),
            prepTime: v.optional(v.string()),
            cookTime: v.optional(v.string()),
          })
        ),
      })
    ),
    // Error information if failed
    error: v.optional(
      v.object({
        code: v.string(),
        message: v.string(),
        retryable: v.boolean(),
      })
    ),
    // Recipe pipeline tracking
    recipeId: v.optional(v.id("recipes")), // Set when converted to recipe
    recipeCreatedAt: v.optional(v.number()), // When recipe was created
    // Retry tracking
    retryCount: v.number(),
    maxRetries: v.number(),
    // Prompt version tracking
    promptVersion: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_uploadId", ["uploadId"])
    .index("by_status", ["status"])
    .index("by_recipeId", ["recipeId"]),

  threads: defineTable({
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    promptVersion: v.optional(v.string()),
  }).index("by_updatedAt", ["updatedAt"]),

  messages: defineTable({
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
    content: v.string(),
    toolCalls: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      arguments: v.string(),
    }))),
    toolCallId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_threadId_createdAt", ["threadId", "createdAt"]),
});
