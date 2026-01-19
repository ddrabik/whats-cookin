"use node";

import OpenAI from "openai";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
  ERROR_CODES,
  MAX_TOKENS,
  OPENAI_MODEL,
  RECIPE_ANALYSIS_PROMPT,
  RECIPE_CONFIDENCE_THRESHOLD,
} from "./constants";
import type { ErrorCode } from "./constants";

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
    // Mark as processing
    await ctx.runMutation(internal.vision.mutations.markProcessing, {
      analysisId: args.analysisId,
    });

    try {
      // Get the storage URL for the file
      const storageUrl = await ctx.storage.getUrl(args.storageId);
      if (!storageUrl) {
        throw createError(ERROR_CODES.INVALID_FORMAT, "Could not get storage URL", false);
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      if (!process.env.OPENAI_API_KEY) {
        throw createError(ERROR_CODES.API_KEY_INVALID, "OPENAI_API_KEY not configured", false);
      }

      // Analyze based on content type
      let result: AnalysisResult;
      if (args.contentType.startsWith("image/")) {
        result = await analyzeImage(openai, storageUrl);
      } else if (args.contentType === "application/pdf") {
        result = await analyzePdf(openai, storageUrl);
      } else {
        throw createError(
          ERROR_CODES.INVALID_FORMAT,
          `Unsupported content type: ${args.contentType}`,
          false
        );
      }

      // Filter out recipeData if confidence is below threshold
      const finalResult: AnalysisResult = {
        rawText: result.rawText,
        description: result.description,
        confidence: result.confidence,
        contentType: result.contentType,
      };

      if (result.confidence >= RECIPE_CONFIDENCE_THRESHOLD && result.recipeData) {
        finalResult.recipeData = result.recipeData;
      }

      // Save successful result
      await ctx.runMutation(internal.vision.mutations.saveResult, {
        analysisId: args.analysisId,
        result: finalResult,
      });
    } catch (error) {
      // Handle and categorize errors
      const errorInfo = categorizeError(error);
      await ctx.runMutation(internal.vision.mutations.markFailed, {
        analysisId: args.analysisId,
        error: errorInfo,
      });
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
          { type: "text", text: RECIPE_ANALYSIS_PROMPT },
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
 * Analyze a PDF using OpenAI Responses API with file input
 */
async function analyzePdf(openai: OpenAI, pdfUrl: string): Promise<AnalysisResult> {
  // For PDFs, we use the responses API with file_url
  // Note: This uses the newer Responses API format
  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: RECIPE_ANALYSIS_PROMPT },
          { type: "input_file", file_url: pdfUrl },
        ],
      },
    ],
  });

  // Extract text from the response
  const outputText = response.output
    .filter((item): item is OpenAI.Responses.ResponseOutputMessage => item.type === "message")
    .flatMap((msg) => msg.content)
    .filter((content): content is OpenAI.Responses.ResponseOutputText => content.type === "output_text")
    .map((content) => content.text)
    .join("");

  if (!outputText) {
    throw createError(ERROR_CODES.PARSE_ERROR, "No content in OpenAI response", true);
  }

  return parseAnalysisResponse(outputText);
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
