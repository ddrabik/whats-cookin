import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireClerkUserId } from "../auth";

/**
 * Saves file metadata after successful storage
 * Called internally from HTTP action after file is stored
 */
export const saveFileMetadata = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    size: v.number(),
    contentType: v.string(),
    uploadSource: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const uploadId = await ctx.db.insert("unauthenticatedUploads", {
      userId,
      storageId: args.storageId,
      filename: args.filename,
      size: args.size,
      contentType: args.contentType,
      uploadDate: Date.now(),
      uploadSource: args.uploadSource,
      sourceUrl: args.sourceUrl,
    });

    return uploadId;
  },
});

/**
 * Deletes an upload and its associated file from storage
 */
export const deleteUpload = mutation({
  args: {
    uploadId: v.id("unauthenticatedUploads"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const upload = await ctx.db.get("unauthenticatedUploads", args.uploadId);
    if (!upload) {
      throw new Error("Upload not found");
    }
    if (upload.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Delete from storage
    await ctx.storage.delete(upload.storageId);

    // Delete metadata
    await ctx.db.delete("unauthenticatedUploads", args.uploadId);

    return { success: true };
  },
});
