import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("threads", {
      title: args.title,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("threads")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(limit);
  },
});

export const get = query({
  args: { id: v.id("threads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const touch = internalMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      updatedAt: Date.now(),
    });
  },
});
