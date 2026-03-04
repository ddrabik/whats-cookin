import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireClerkUserId } from "./auth";

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const now = Date.now();
    return await ctx.db.insert("threads", {
      userId,
      title: args.title,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("threads")
      .withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const get = query({
  args: { id: v.id("threads") },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const thread = await ctx.db.get("threads", args.id);
    if (!thread || thread.userId !== userId) {
      return null;
    }
    return thread;
  },
});

export const getInternal = internalQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return await ctx.db.get("threads", args.threadId);
  },
});

export const touch = internalMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await ctx.db.patch("threads", args.threadId, {
      updatedAt: Date.now(),
    });
  },
});

export const setPromptVersion = internalMutation({
  args: {
    threadId: v.id("threads"),
    promptVersion: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("threads", args.threadId, {
      promptVersion: args.promptVersion,
    });
  },
});
