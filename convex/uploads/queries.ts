import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireClerkUserId } from "../auth";

/**
 * Lists all uploads with optional pagination
 * Returns uploads in descending order (most recent first)
 */
export const listUploads = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("unauthenticatedUploads")
      .withIndex("by_userId_uploadDate", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
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
    const userId = await requireClerkUserId(ctx);
    const upload = await ctx.db.get("unauthenticatedUploads", args.uploadId);
    if (!upload || upload.userId !== userId) {
      return null;
    }
    return upload;
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
    const userId = await requireClerkUserId(ctx);
    return await ctx.db
      .query("unauthenticatedUploads")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
  },
});
