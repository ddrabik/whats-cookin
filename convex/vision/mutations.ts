import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { MAX_RETRIES, RETRY_DELAYS } from "./constants";

/**
 * Triggers vision analysis for an uploaded file
 * Creates a pending analysis record and schedules the async action
 */
export const triggerAnalysis = mutation({
  args: {
    uploadId: v.id("unauthenticatedUploads"),
  },
  handler: async (ctx, args) => {
    // Get upload metadata
    const upload = await ctx.db.get("unauthenticatedUploads", args.uploadId);
    if (!upload) {
      throw new Error("Upload not found");
    }

    // Check if analysis already exists for this upload
    const existing = await ctx.db
      .query("visionAnalysis")
      .withIndex("by_uploadId", (q) => q.eq("uploadId", args.uploadId))
      .first();

    if (existing) {
      // Return existing analysis ID if one exists
      return existing._id;
    }

    // Create pending analysis record
    const now = Date.now();
    const analysisId = await ctx.db.insert("visionAnalysis", {
      uploadId: args.uploadId,
      storageId: upload.storageId,
      status: "pending",
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule async analysis action immediately
    await ctx.scheduler.runAfter(0, internal.vision.actions.analyzeUpload,
      {
        analysisId,
        storageId: upload.storageId,
        contentType: upload.contentType,
      }
    );

    return analysisId;
  },
});

/**
 * Internal mutation to update analysis status to processing
 * Called by the action when it starts processing
 */
export const markProcessing = internalMutation({
  args: {
    analysisId: v.id("visionAnalysis"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("visionAnalysis", args.analysisId, {
      status: "processing",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to save successful analysis results
 * Called by the action after OpenAI returns results
 * Automatically triggers recipe creation for high-confidence analyses
 */
export const saveResult = internalMutation({
  args: {
    analysisId: v.id("visionAnalysis"),
    result: v.object({
      rawText: v.string(),
      description: v.string(),
      confidence: v.number(),
      contentType: v.string(),
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
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch("visionAnalysis", args.analysisId, {
      status: "completed",
      analysisResult: args.result,
      updatedAt: now,
      completedAt: now,
    });

    // Trigger recipe creation pipeline for high-confidence analyses
    // This runs asynchronously so analysis completion isn't blocked
    await ctx.scheduler.runAfter(
      0,
      internal.recipePipeline.processCompletedAnalysis,
      { analysisId: args.analysisId }
    );
  },
});

/**
 * Internal mutation to mark analysis as failed
 * Handles retry logic with exponential backoff
 */
export const markFailed = internalMutation({
  args: {
    analysisId: v.id("visionAnalysis"),
    error: v.object({
      code: v.string(),
      message: v.string(),
      retryable: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get("visionAnalysis", args.analysisId);
    if (!analysis) {
      throw new Error("Analysis not found");
    }

    const newRetryCount = analysis.retryCount + 1;
    const shouldRetry = args.error.retryable && newRetryCount <= analysis.maxRetries;

    await ctx.db.patch("visionAnalysis", args.analysisId, {
      status: shouldRetry ? "pending" : "failed",
      error: args.error,
      retryCount: newRetryCount,
      updatedAt: Date.now(),
    });

    // Schedule retry if applicable
    if (shouldRetry) {
      const delayIndex = Math.min(newRetryCount - 1, RETRY_DELAYS.length - 1);
      const delay = RETRY_DELAYS[delayIndex];

      // Get content type from upload record
      const upload = await ctx.db.get("unauthenticatedUploads", analysis.uploadId);
      const contentType = upload?.contentType ?? "application/octet-stream";

      await ctx.scheduler.runAfter(delay, internal.vision.actions.analyzeUpload, {
        analysisId: args.analysisId,
        storageId: analysis.storageId,
        contentType,
      });
    }
  },
});
