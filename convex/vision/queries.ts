import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Gets the vision analysis for a specific upload
 * Returns null if no analysis exists for this upload
 */
export const getAnalysisByUploadId = query({
  args: {
    uploadId: v.id("unauthenticatedUploads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("visionAnalysis")
      .withIndex("by_uploadId", (q) => q.eq("uploadId", args.uploadId))
      .first();
  },
});

/**
 * Gets a vision analysis by its ID
 */
export const getAnalysis = query({
  args: {
    analysisId: v.id("visionAnalysis"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get("visionAnalysis", args.analysisId);
  },
});

/**
 * Lists analyses by status for debugging/monitoring
 */
export const listAnalysesByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("visionAnalysis")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(limit);
  },
});

/**
 * Gets an upload with its associated analysis in a single query
 * Useful for displaying upload details with analysis status
 */
export const getUploadWithAnalysis = query({
  args: {
    uploadId: v.id("unauthenticatedUploads"),
  },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get("unauthenticatedUploads", args.uploadId);
    if (!upload) {
      return null;
    }

    const analysis = await ctx.db
      .query("visionAnalysis")
      .withIndex("by_uploadId", (q) => q.eq("uploadId", args.uploadId))
      .first();

    // Get storage URL for the upload
    const storageUrl = await ctx.storage.getUrl(upload.storageId);

    return {
      upload: {
        ...upload,
        storageUrl,
      },
      analysis,
    };
  },
});

/**
 * Gets all pending recipe analyses for displaying placeholders
 * Returns analyses that are pending or processing and haven't been converted to recipes yet
 */
export const getPendingRecipes = query({
  args: {},
  handler: async (ctx) => {
    // Get all pending and processing analyses
    const pendingAnalyses = await ctx.db
      .query("visionAnalysis")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "processing")
        )
      )
      .order("desc")
      .collect();

    // Get completed analyses that don't have a recipe yet
    const completedWithoutRecipe = await ctx.db
      .query("visionAnalysis")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .filter((q) => q.eq(q.field("recipeId"), undefined))
      .order("desc")
      .take(10);

    const allPending = [...pendingAnalyses, ...completedWithoutRecipe];

    // Fetch upload details and storage URLs for each
    const pendingWithDetails = await Promise.all(
      allPending.map(async (analysis) => {
        const upload = await ctx.db.get("unauthenticatedUploads", analysis.uploadId);
        if (!upload) return null;

        const storageUrl = await ctx.storage.getUrl(upload.storageId);

        return {
          analysisId: analysis._id,
          uploadId: analysis.uploadId,
          status: analysis.status,
          filename: upload.filename,
          imageUrl: storageUrl,
          uploadDate: upload.uploadDate,
          // Extract title from analysis if available
          title: analysis.analysisResult?.recipeData?.title,
        };
      })
    );

    return pendingWithDetails.filter((item) => item !== null);
  },
});

/**
 * Gets recent failed imports with upload context for cookbook error alerts.
 * Uses the status index so the alert feed doesn't require scanning all analyses.
 */
export const getRecentFailedImports = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const failedAnalyses = await ctx.db
      .query("visionAnalysis")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .order("desc")
      .take(limit);

    const failures = await Promise.all(
      failedAnalyses.map(async (analysis) => {
        const upload = await ctx.db.get("unauthenticatedUploads", analysis.uploadId);
        if (!upload || !analysis.error) {
          return null;
        }

        const isUrlImport =
          upload.contentType === "text/html" || typeof upload.sourceUrl === "string";
        const isRecipeCreationFailure = analysis.error.code === "RECIPE_PIPELINE_ERROR";

        const importPath = isUrlImport ? "url" : "image";
        const stage = isRecipeCreationFailure ? "recipe_creation" : "analysis";

        return {
          analysisId: analysis._id,
          failedAt: analysis.updatedAt,
          uploadDate: upload.uploadDate,
          filename: upload.filename,
          contentType: upload.contentType,
          sourceUrl: upload.sourceUrl,
          retryCount: analysis.retryCount,
          maxRetries: analysis.maxRetries,
          error: analysis.error,
          importPath,
          stage,
        };
      })
    );

    return failures.filter((failure) => failure !== null);
  },
});
