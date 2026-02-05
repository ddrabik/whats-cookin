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
 * File type signatures (magic numbers) for validation
 * Validates actual file content, not just MIME type or extension
 */
const FILE_SIGNATURES = {
  // JPEG: FF D8 FF
  jpeg: [0xff, 0xd8, 0xff],
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  // GIF: 47 49 46 38 (GIF8)
  gif: [0x47, 0x49, 0x46, 0x38],
  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
  webp: { riff: [0x52, 0x49, 0x46, 0x46], webp: [0x57, 0x45, 0x42, 0x50] },
} as const;

/**
 * Validates file signature by checking magic numbers in file header
 * @param arrayBuffer - File data as ArrayBuffer
 * @returns Validation result with detected file type or error
 */
export function validateFileSignature(
  arrayBuffer: ArrayBuffer,
): FileValidationResult {
  const bytes = new Uint8Array(arrayBuffer);

  // Need at least 12 bytes for WebP validation
  if (bytes.length < 12) {
    return {
      valid: false,
      error: new FileValidationError(
        "File is too small to validate",
        "FILE_TOO_SMALL",
      ),
    };
  }

  // Check JPEG signature
  if (
    bytes[0] === FILE_SIGNATURES.jpeg[0] &&
    bytes[1] === FILE_SIGNATURES.jpeg[1] &&
    bytes[2] === FILE_SIGNATURES.jpeg[2]
  ) {
    return { valid: true };
  }

  // Check PNG signature
  if (
    bytes[0] === FILE_SIGNATURES.png[0] &&
    bytes[1] === FILE_SIGNATURES.png[1] &&
    bytes[2] === FILE_SIGNATURES.png[2] &&
    bytes[3] === FILE_SIGNATURES.png[3] &&
    bytes[4] === FILE_SIGNATURES.png[4] &&
    bytes[5] === FILE_SIGNATURES.png[5] &&
    bytes[6] === FILE_SIGNATURES.png[6] &&
    bytes[7] === FILE_SIGNATURES.png[7]
  ) {
    return { valid: true };
  }

  // Check GIF signature
  if (
    bytes[0] === FILE_SIGNATURES.gif[0] &&
    bytes[1] === FILE_SIGNATURES.gif[1] &&
    bytes[2] === FILE_SIGNATURES.gif[2] &&
    bytes[3] === FILE_SIGNATURES.gif[3]
  ) {
    return { valid: true };
  }

  // Check WebP signature (RIFF at 0-3, WEBP at 8-11)
  if (
    bytes[0] === FILE_SIGNATURES.webp.riff[0] &&
    bytes[1] === FILE_SIGNATURES.webp.riff[1] &&
    bytes[2] === FILE_SIGNATURES.webp.riff[2] &&
    bytes[3] === FILE_SIGNATURES.webp.riff[3] &&
    bytes[8] === FILE_SIGNATURES.webp.webp[0] &&
    bytes[9] === FILE_SIGNATURES.webp.webp[1] &&
    bytes[10] === FILE_SIGNATURES.webp.webp[2] &&
    bytes[11] === FILE_SIGNATURES.webp.webp[3]
  ) {
    return { valid: true };
  }

  return {
    valid: false,
    error: new FileValidationError(
      "File signature does not match allowed image types (PNG, JPEG, WEBP, GIF)",
      "INVALID_FILE_SIGNATURE",
    ),
  };
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
