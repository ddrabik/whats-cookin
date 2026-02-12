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
