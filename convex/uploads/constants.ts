/**
 * File upload configuration constants
 */

/** Maximum file size: 10MB in bytes */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Allowed MIME types for recipe uploads
 * Matches OpenAI Vision API supported formats: PNG, JPEG, WEBP, non-animated GIF
 * @see https://platform.openai.com/docs/guides/images-vision
 */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Allowed file extensions for recipe uploads */
export const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
] as const;

/** Type for allowed MIME types */
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
