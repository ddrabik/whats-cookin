"use node";

import OpenAI from "openai";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
  RECIPE_ANALYSIS_PROMPT,
  RECIPE_HTML_ANALYSIS_PROMPT,
  promptTag,
} from "../prompts";
import {
  ERROR_CODES,
  MAX_TOKENS,
  OPENAI_MODEL,
  RECIPE_CONFIDENCE_THRESHOLD,
} from "./constants";
import type { ErrorCode } from "./constants";

export const MAX_HTML_INPUT_CHARS = 120_000;

/**
 * Result structure from OpenAI analysis
 */
interface AnalysisResult {
  rawText: string;
  description: string;
  confidence: number;
  contentType: string;
  recipeData?: {
    title?: string;
    ingredients?: Array<string>;
    instructions?: Array<string>;
    servings?: string;
    prepTime?: string;
    cookTime?: string;
  };
}

/**
 * Internal action to analyze an uploaded file using OpenAI Vision API
 * Runs in Node.js environment to use OpenAI SDK
 */
export const analyzeUpload = internalAction({
  args: {
    analysisId: v.id("visionAnalysis"),
    storageId: v.id("_storage"),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    await markAnalysisProcessing(ctx, args.analysisId);
    try {
      if (!args.contentType.startsWith("image/")) {
        throw createError(
          ERROR_CODES.INVALID_FORMAT,
          `Unsupported OCR content type: ${args.contentType}`,
          false
        );
      }

      const storageUrl = await getStorageUrlOrThrow(ctx, args.storageId);
      const openai = createOpenAIClient();
      const result = await analyzeImage(openai, storageUrl);
      await saveSuccessfulResult(
        ctx,
        args.analysisId,
        result,
        promptTag(RECIPE_ANALYSIS_PROMPT)
      );
    } catch (error) {
      await markAnalysisFailed(ctx, args.analysisId, error);
    }
  },
});

/**
 * Internal action to analyze URL-imported HTML using the Responses API.
 * Kept separate from OCR/image path so URL fallback can evolve independently.
 */
export const analyzeHtmlUpload = internalAction({
  args: {
    analysisId: v.id("visionAnalysis"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await markAnalysisProcessing(ctx, args.analysisId);
    try {
      const storageUrl = await getStorageUrlOrThrow(ctx, args.storageId);
      const openai = createOpenAIClient();
      const result = await analyzeHtml(openai, storageUrl);
      await saveSuccessfulResult(
        ctx,
        args.analysisId,
        result,
        promptTag(RECIPE_HTML_ANALYSIS_PROMPT)
      );
    } catch (error) {
      await markAnalysisFailed(ctx, args.analysisId, error);
    }
  },
});

/**
 * Analyze an image using OpenAI Chat Completions API with vision
 */
async function analyzeImage(openai: OpenAI, imageUrl: string): Promise<AnalysisResult> {
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: RECIPE_ANALYSIS_PROMPT.content },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
    max_tokens: MAX_TOKENS,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw createError(ERROR_CODES.PARSE_ERROR, "No content in OpenAI response", true);
  }

  return parseAnalysisResponse(content);
}

/**
 * Analyze recipe HTML using the Responses API.
 */
async function analyzeHtml(openai: OpenAI, htmlUrl: string): Promise<AnalysisResult> {
  const htmlResponse = await fetch(htmlUrl);
  if (!htmlResponse.ok) {
    throw createError(
      ERROR_CODES.INVALID_FORMAT,
      `Failed to fetch stored HTML: ${htmlResponse.status}`,
      true
    );
  }

  const rawHtml = await htmlResponse.text();
  if (!rawHtml.trim()) {
    throw createError(ERROR_CODES.INVALID_FORMAT, "Stored HTML is empty", false);
  }

  const preparedHtml = prepareHtmlForModel(rawHtml);

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    instructions: RECIPE_HTML_ANALYSIS_PROMPT.content,
    input: `Extract recipe information from this HTML document:\n\n${preparedHtml}`,
    max_output_tokens: MAX_TOKENS,
  });

  const content = response.output_text.trim();
  if (!content) {
    throw createError(ERROR_CODES.PARSE_ERROR, "No content in OpenAI response", true);
  }

  return parseAnalysisResponse(content);
}

export function prepareHtmlForModel(html: string): string {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
  const normalized = withoutStyles.trim();

  if (normalized.length <= MAX_HTML_INPUT_CHARS) {
    return normalized;
  }

  return normalized.slice(0, MAX_HTML_INPUT_CHARS);
}

async function markAnalysisProcessing(
  ctx: any,
  analysisId: any
) {
  await ctx.runMutation(internal.vision.mutations.markProcessing, { analysisId });
}

function createOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw createError(ERROR_CODES.API_KEY_INVALID, "OPENAI_API_KEY not configured", false);
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function getStorageUrlOrThrow(
  ctx: any,
  storageId: any
): Promise<string> {
  const storageUrl = await ctx.storage.getUrl(storageId);
  if (!storageUrl) {
    throw createError(ERROR_CODES.INVALID_FORMAT, "Could not get storage URL", false);
  }
  return storageUrl;
}

async function saveSuccessfulResult(
  ctx: any,
  analysisId: any,
  result: AnalysisResult,
  promptVersion: string
) {
  // Filter out recipeData if confidence is below threshold.
  const finalResult: AnalysisResult = {
    rawText: result.rawText,
    description: result.description,
    confidence: result.confidence,
    contentType: result.contentType,
  };

  if (result.confidence >= RECIPE_CONFIDENCE_THRESHOLD && result.recipeData) {
    finalResult.recipeData = result.recipeData;
  }

  await ctx.runMutation(internal.vision.mutations.saveResult, {
    analysisId,
    result: finalResult,
    promptVersion,
  });
}

async function markAnalysisFailed(
  ctx: any,
  analysisId: any,
  error: unknown
) {
  const errorInfo = categorizeError(error);
  await ctx.runMutation(internal.vision.mutations.markFailed, {
    analysisId,
    error: errorInfo,
  });
}

/**
 * Recursively converts null values to undefined
 * JSON has null but Convex v.optional() expects undefined, not null
 */
function sanitizeNulls<T>(obj: T): T {
  if (obj === null) {
    return undefined as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeNulls) as T;
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitized = sanitizeNulls(value);
      // Only include non-undefined values
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result as T;
  }
  return obj;
}

/**
 * Parse JSON response from OpenAI into AnalysisResult
 */
function parseAnalysisResponse(content: string): AnalysisResult {
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (typeof parsed.rawText !== "string") {
      throw new Error("Missing rawText field");
    }
    if (typeof parsed.description !== "string") {
      throw new Error("Missing description field");
    }
    if (typeof parsed.confidence !== "number") {
      throw new Error("Missing confidence field");
    }
    if (typeof parsed.contentType !== "string") {
      throw new Error("Missing contentType field");
    }

    // Sanitize null values to undefined for Convex compatibility
    const sanitizedRecipeData = parsed.recipeData
      ? sanitizeNulls(parsed.recipeData)
      : undefined;

    return {
      rawText: parsed.rawText,
      description: parsed.description,
      confidence: parsed.confidence,
      contentType: parsed.contentType,
      recipeData: sanitizedRecipeData,
    };
  } catch (parseError) {
    throw createError(
      ERROR_CODES.PARSE_ERROR,
      `Failed to parse OpenAI response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
      true
    );
  }
}

/**
 * Create a structured error object
 */
function createError(code: ErrorCode, message: string, retryable: boolean) {
  return { code, message, retryable, isStructuredError: true as const };
}

/**
 * Type guard for structured errors created by createError
 */
function isStructuredError(
  error: unknown
): error is { code: string; message: string; retryable: boolean; isStructuredError: true } {
  return (
    error !== null &&
    typeof error === "object" &&
    "isStructuredError" in error &&
    "code" in error &&
    "message" in error &&
    "retryable" in error &&
    (error as { isStructuredError: unknown }).isStructuredError === true
  );
}

/**
 * Categorize an error into our standard format
 */
function categorizeError(error: unknown): { code: string; message: string; retryable: boolean } {
  // Check if it's our structured error
  if (isStructuredError(error)) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }

  // Handle OpenAI API errors
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) {
      return {
        code: ERROR_CODES.RATE_LIMIT,
        message: error.message,
        retryable: true,
      };
    }
    if (error.status && error.status >= 500) {
      return {
        code: ERROR_CODES.SERVER_ERROR,
        message: error.message,
        retryable: true,
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        code: ERROR_CODES.API_KEY_INVALID,
        message: error.message,
        retryable: false,
      };
    }
    if (error.code === "content_policy_violation") {
      return {
        code: ERROR_CODES.CONTENT_POLICY,
        message: error.message,
        retryable: false,
      };
    }
  }

  // Handle timeout errors
  if (error instanceof Error && error.message.includes("timeout")) {
    return {
      code: ERROR_CODES.TIMEOUT,
      message: error.message,
      retryable: true,
    };
  }

  // Generic error handling
  return {
    code: ERROR_CODES.UNKNOWN,
    message: error instanceof Error ? error.message : "Unknown error occurred",
    retryable: false,
  };
}
