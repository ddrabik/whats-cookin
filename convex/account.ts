import { mutation } from "./_generated/server";
import { requireClerkUserId } from "./auth";

export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireClerkUserId(ctx);

    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .collect();
    for (const recipe of recipes) {
      await ctx.db.delete("recipes", recipe._id);
    }

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
      .collect();
    for (const thread of threads) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
        .collect();
      for (const message of messages) {
        await ctx.db.delete("messages", message._id);
      }
      await ctx.db.delete("threads", thread._id);
    }

    const uploads = await ctx.db
      .query("unauthenticatedUploads")
      .withIndex("by_userId_uploadDate", (q) => q.eq("userId", userId))
      .collect();
    for (const upload of uploads) {
      await ctx.storage.delete(upload.storageId);
      await ctx.db.delete("unauthenticatedUploads", upload._id);
    }

    const analyses = await ctx.db
      .query("visionAnalysis")
      .withIndex("by_userId_status", (q) => q.eq("userId", userId).eq("status", "pending"))
      .collect();
    const processing = await ctx.db
      .query("visionAnalysis")
      .withIndex("by_userId_status", (q) => q.eq("userId", userId).eq("status", "processing"))
      .collect();
    const completed = await ctx.db
      .query("visionAnalysis")
      .withIndex("by_userId_status", (q) => q.eq("userId", userId).eq("status", "completed"))
      .collect();
    const failed = await ctx.db
      .query("visionAnalysis")
      .withIndex("by_userId_status", (q) => q.eq("userId", userId).eq("status", "failed"))
      .collect();

    for (const analysis of [...analyses, ...processing, ...completed, ...failed]) {
      await ctx.db.delete("visionAnalysis", analysis._id);
    }

    return { success: true };
  },
});
