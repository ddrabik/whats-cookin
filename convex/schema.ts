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
    // MIME type (e.g., image/jpeg, application/pdf)
    contentType: v.string(),
    // Upload timestamp
    uploadDate: v.number(),
    // Optional: Client user agent for tracking
    uploadSource: v.optional(v.string()),
  })
    .index("by_storageId", ["storageId"])
    .index("by_uploadDate", ["uploadDate"])
    .index("by_contentType", ["contentType"]),

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
    // Retry tracking
    retryCount: v.number(),
    maxRetries: v.number(),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_uploadId", ["uploadId"])
    .index("by_status", ["status"]),
});
