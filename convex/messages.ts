import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

export const list = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_threadId_createdAt", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
  },
});

export const listInternal = internalQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_threadId_createdAt", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
  },
});

export const send = mutation({
  args: {
    threadId: v.id("threads"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
    });

    // Trigger the chat action to generate a response
    await ctx.scheduler.runAfter(0, internal.chat.respond, {
      threadId: args.threadId,
    });
  },
});

export const saveAssistant = internalMutation({
  args: {
    threadId: v.id("threads"),
    content: v.string(),
    toolCalls: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          arguments: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: "assistant",
      content: args.content,
      toolCalls: args.toolCalls,
      createdAt: Date.now(),
    });
  },
});

export const saveTool = internalMutation({
  args: {
    threadId: v.id("threads"),
    content: v.string(),
    toolCallId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: "tool",
      content: args.content,
      toolCallId: args.toolCallId,
      createdAt: Date.now(),
    });
  },
});
