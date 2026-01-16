import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Lists all uploads with optional pagination
 * Returns uploads in descending order (most recent first)
 */
export const listUploads = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const uploads = await ctx.db
      .query("unauthenticatedUploads")
      .order("desc")
      .take(limit);

    return uploads;
  },
});

/**
 * Gets a single upload by ID
 */
export const getUpload = query({
  args: {
    uploadId: v.id("unauthenticatedUploads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.uploadId);
  },
});

/**
 * Gets an upload by storage ID
 * Useful for looking up metadata when you have a storageId
 */
export const getUploadByStorageId = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("unauthenticatedUploads")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
  },
});
