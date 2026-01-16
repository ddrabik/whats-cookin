/**
 * File upload configuration constants
 */

/** Maximum file size: 10MB in bytes */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** Allowed MIME types for recipe uploads */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/pdf",
] as const;

/** Allowed file extensions for recipe uploads */
export const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".webp",
  ".pdf",
] as const;

/** Type for allowed MIME types */
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
