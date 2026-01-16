import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "./constants";

/**
 * Custom error class for file validation failures
 */
export class FileValidationError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "FileValidationError";
  }
}

/**
 * Result of file validation
 */
export interface FileValidationResult {
  valid: boolean;
  error?: FileValidationError;
}

/**
 * Validates file size against MAX_FILE_SIZE constant
 * @param sizeBytes - File size in bytes
 * @returns Validation result with error if file is too large
 */
export function validateFileSize(sizeBytes: number): FileValidationResult {
  if (sizeBytes > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: new FileValidationError(
        `File size ${sizeBytes} bytes exceeds maximum ${MAX_FILE_SIZE} bytes (10MB)`,
        "FILE_TOO_LARGE",
      ),
    };
  }
  return { valid: true };
}

/**
 * Validates MIME type against allowed types
 * @param contentType - MIME type to validate
 * @returns Validation result with error if type is not allowed
 */
export function validateMimeType(contentType: string): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(contentType as any)) {
    return {
      valid: false,
      error: new FileValidationError(
        `File type "${contentType}" is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
        "INVALID_FILE_TYPE",
      ),
    };
  }
  return { valid: true };
}

/**
 * Validates filename is provided and within reasonable length
 * @param filename - Filename to validate
 * @returns Validation result with error if filename is invalid
 */
export function validateFilename(filename: string): FileValidationResult {
  if (!filename || filename.trim().length === 0) {
    return {
      valid: false,
      error: new FileValidationError("Filename is required", "MISSING_FILENAME"),
    };
  }

  if (filename.length > 255) {
    return {
      valid: false,
      error: new FileValidationError(
        "Filename too long (max 255 characters)",
        "FILENAME_TOO_LONG",
      ),
    };
  }

  return { valid: true };
}

/**
 * Validates entire file upload request
 * Checks filename, size, and MIME type
 * @param blob - File blob to validate
 * @param filename - Filename to validate
 * @returns Validation result with error if any validation fails
 */
export function validateFileUpload(
  blob: Blob,
  filename: string,
): FileValidationResult {
  // Validate filename
  const filenameResult = validateFilename(filename);
  if (!filenameResult.valid) {
    return filenameResult;
  }

  // Validate file size
  const sizeResult = validateFileSize(blob.size);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  // Validate MIME type
  const mimeResult = validateMimeType(blob.type);
  if (!mimeResult.valid) {
    return mimeResult;
  }

  return { valid: true };
}
