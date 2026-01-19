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
