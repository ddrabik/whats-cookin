/**
 * Vision analysis configuration constants
 */

/** Maximum number of retry attempts for failed analyses */
export const MAX_RETRIES = 3;

/** Retry delays in milliseconds (exponential backoff: 5s, 30s, 2min) */
export const RETRY_DELAYS = [5000, 30000, 120000] as const;

/** OpenAI model to use for vision analysis */
export const OPENAI_MODEL = "gpt-4o";

/** Maximum tokens for OpenAI response */
export const MAX_TOKENS = 4096;

/** Minimum confidence threshold for including structured recipe data */
export const RECIPE_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Prompt for recipe extraction from images
 * This prompt guides OpenAI to extract structured recipe data
 */
export const RECIPE_ANALYSIS_PROMPT = `You are a recipe extraction assistant. Analyze this image and extract recipe information.

Your response MUST be valid JSON with this exact structure:
{
  "rawText": "Full text content visible in the image, preserving line breaks",
  "description": "Brief 1-2 sentence description of what the image contains",
  "confidence": 0.0 to 1.0 (how confident you are this is a recipe with parseable data),
  "contentType": "recipe" | "ingredient_list" | "other",
  "recipeData": {
    "title": "Recipe title if found",
    "ingredients": ["ingredient 1", "ingredient 2", ...],
    "instructions": ["step 1", "step 2", ...],
    "servings": "Number of servings if found",
    "prepTime": "Prep time if found (e.g., '15 minutes')",
    "cookTime": "Cook time if found (e.g., '30 minutes')"
  }
}

Rules:
1. ALWAYS include rawText, description, confidence, and contentType
2. Only include recipeData if you can confidently extract at least a title AND (ingredients OR instructions)
3. Set confidence to 0.7+ only if you can extract meaningful structured data
4. For ingredient_list content (shopping lists, ingredient notes), still extract what you can
5. For "other" content, set confidence low and omit recipeData
6. If text is not in English, translate it to English in the extracted data
7. Clean up OCR artifacts and formatting issues in the extracted text

Respond ONLY with valid JSON, no additional text.`;

/**
 * Error codes for categorizing failures
 */
export const ERROR_CODES = {
  RATE_LIMIT: "rate_limit",
  SERVER_ERROR: "server_error",
  INVALID_FORMAT: "invalid_format",
  API_KEY_INVALID: "api_key_invalid",
  CONTENT_POLICY: "content_policy",
  TIMEOUT: "timeout",
  PARSE_ERROR: "parse_error",
  UNKNOWN: "unknown",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
