import { convexTest } from "convex-test";
import { describe, test, expect, beforeEach } from "vitest";
import {
  validateFileSize,
  validateMimeType,
  validateFilename,
  validateFileUpload,
  FileValidationError,
} from "./uploads/validation";
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "./uploads/constants";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("File Upload Validation", () => {
  describe("validateFileSize", () => {
    test("accepts files under 10MB", () => {
      const result = validateFileSize(5 * 1024 * 1024); // 5MB
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("accepts files exactly at 10MB", () => {
      const result = validateFileSize(MAX_FILE_SIZE);
      expect(result.valid).toBe(true);
    });

    test("rejects files over 10MB", () => {
      const result = validateFileSize(11 * 1024 * 1024); // 11MB
      expect(result.valid).toBe(false);
      expect(result.error).toBeInstanceOf(FileValidationError);
      expect(result.error?.code).toBe("FILE_TOO_LARGE");
      expect(result.error?.message).toContain("exceeds maximum");
    });

    test("rejects files at 10MB + 1 byte", () => {
      const result = validateFileSize(MAX_FILE_SIZE + 1);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("FILE_TOO_LARGE");
    });
  });

  describe("validateMimeType", () => {
    test("accepts image/jpeg", () => {
      const result = validateMimeType("image/jpeg");
      expect(result.valid).toBe(true);
    });

    test("accepts image/png", () => {
      const result = validateMimeType("image/png");
      expect(result.valid).toBe(true);
    });

    test("accepts image/heic", () => {
      const result = validateMimeType("image/heic");
      expect(result.valid).toBe(true);
    });

    test("accepts image/webp", () => {
      const result = validateMimeType("image/webp");
      expect(result.valid).toBe(true);
    });

    test("accepts application/pdf", () => {
      const result = validateMimeType("application/pdf");
      expect(result.valid).toBe(true);
    });

    test("rejects image/gif", () => {
      const result = validateMimeType("image/gif");
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("INVALID_FILE_TYPE");
    });

    test("rejects video/mp4", () => {
      const result = validateMimeType("video/mp4");
      expect(result.valid).toBe(false);
      expect(result.error?.message).toContain("not allowed");
    });

    test("rejects application/zip", () => {
      const result = validateMimeType("application/zip");
      expect(result.valid).toBe(false);
    });
  });

  describe("validateFilename", () => {
    test("accepts valid filename", () => {
      const result = validateFilename("recipe.jpg");
      expect(result.valid).toBe(true);
    });

    test("accepts filename with spaces", () => {
      const result = validateFilename("my recipe photo.png");
      expect(result.valid).toBe(true);
    });

    test("rejects empty filename", () => {
      const result = validateFilename("");
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("MISSING_FILENAME");
    });

    test("rejects whitespace-only filename", () => {
      const result = validateFilename("   ");
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("MISSING_FILENAME");
    });

    test("rejects filename over 255 characters", () => {
      const longFilename = "a".repeat(256) + ".jpg";
      const result = validateFilename(longFilename);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("FILENAME_TOO_LONG");
    });

    test("accepts filename with exactly 255 characters", () => {
      const filename = "a".repeat(251) + ".jpg"; // 255 total
      const result = validateFilename(filename);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateFileUpload", () => {
    test("accepts valid file", () => {
      const blob = new Blob(["test content"], { type: "image/jpeg" });
      Object.defineProperty(blob, "size", { value: 1024 });

      const result = validateFileUpload(blob, "test.jpg");
      expect(result.valid).toBe(true);
    });

    test("rejects file with invalid size", () => {
      const blob = new Blob(["test"], { type: "image/jpeg" });
      Object.defineProperty(blob, "size", { value: 11 * 1024 * 1024 });

      const result = validateFileUpload(blob, "test.jpg");
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("FILE_TOO_LARGE");
    });

    test("rejects file with invalid type", () => {
      const blob = new Blob(["test"], { type: "video/mp4" });
      Object.defineProperty(blob, "size", { value: 1024 });

      const result = validateFileUpload(blob, "test.mp4");
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("INVALID_FILE_TYPE");
    });

    test("rejects file with invalid filename", () => {
      const blob = new Blob(["test"], { type: "image/jpeg" });
      Object.defineProperty(blob, "size", { value: 1024 });

      const result = validateFileUpload(blob, "");
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("MISSING_FILENAME");
    });
  });
});

describe("File Upload Mutations", () => {
  describe("saveFileMetadata", () => {
    test("saves file metadata successfully", async () => {
      const t = convexTest(schema, modules);

      // Create a mock file in storage first
      const storageId = await t.run(async (ctx) => {
        const blob = new Blob(["test content"], { type: "image/jpeg" });
        return await ctx.storage.store(blob);
      });

      const uploadId = await t.mutation(api.uploads.mutations.saveFileMetadata, {
        storageId,
        filename: "test.jpg",
        size: 1024,
        contentType: "image/jpeg",
      });

      expect(uploadId).toBeDefined();

      // Verify it was saved
      const upload = await t.query(api.uploads.queries.getUpload, { uploadId });
      expect(upload).toBeDefined();
      expect(upload?.filename).toBe("test.jpg");
      expect(upload?.size).toBe(1024);
      expect(upload?.contentType).toBe("image/jpeg");
      expect(upload?.storageId).toBe(storageId);
    });

    test("saves upload with optional source", async () => {
      const t = convexTest(schema, modules);

      const storageId = await t.run(async (ctx) => {
        const blob = new Blob(["test"], { type: "image/png" });
        return await ctx.storage.store(blob);
      });

      const uploadId = await t.mutation(api.uploads.mutations.saveFileMetadata, {
        storageId,
        filename: "test.png",
        size: 2048,
        contentType: "image/png",
        uploadSource: "Mozilla/5.0...",
      });

      const upload = await t.query(api.uploads.queries.getUpload, { uploadId });
      expect(upload?.uploadSource).toBe("Mozilla/5.0...");
    });
  });

  describe("deleteUpload", () => {
    test("deletes upload and storage file", async () => {
      const t = convexTest(schema, modules);

      // Create a test upload first
      const storageId = await t.run(async (ctx) => {
        const blob = new Blob(["delete me"], { type: "image/jpeg" });
        return await ctx.storage.store(blob);
      });

      const uploadId = await t.mutation(api.uploads.mutations.saveFileMetadata, {
        storageId,
        filename: "delete-me.jpg",
        size: 512,
        contentType: "image/jpeg",
      });

      // Delete it
      const result = await t.mutation(api.uploads.mutations.deleteUpload, {
        uploadId,
      });

      expect(result.success).toBe(true);

      // Verify it's gone
      const upload = await t.query(api.uploads.queries.getUpload, { uploadId });
      expect(upload).toBeNull();
    });

    test("throws error when deleting non-existent upload", async () => {
      const t = convexTest(schema, modules);

      // Create a valid ID that doesn't exist
      const fakeId = await t.run(async (ctx) => {
        // Insert and immediately delete to get a valid but non-existent ID
        const storageId = await ctx.storage.store(
          new Blob(["temp"], { type: "image/jpeg" }),
        );
        const id = await ctx.db.insert("unauthenticatedUploads", {
          storageId,
          filename: "temp.jpg",
          size: 1,
          contentType: "image/jpeg",
          uploadDate: Date.now(),
        });
        await ctx.db.delete(id);
        await ctx.storage.delete(storageId);
        return id;
      });

      await expect(
        t.mutation(api.uploads.mutations.deleteUpload, {
          uploadId: fakeId,
        }),
      ).rejects.toThrow("Upload not found");
    });
  });
});

describe("File Upload Queries", () => {
  describe("listUploads", () => {
    test("returns empty array when no uploads", async () => {
      const t = convexTest(schema, modules);
      const uploads = await t.query(api.uploads.queries.listUploads, {});
      expect(uploads).toEqual([]);
    });

    test("returns uploads in descending order", async () => {
      const t = convexTest(schema, modules);

      // Create multiple uploads
      const storageId1 = await t.run(async (ctx) => {
        const blob = new Blob(["first"], { type: "image/jpeg" });
        return await ctx.storage.store(blob);
      });

      const storageId2 = await t.run(async (ctx) => {
        const blob = new Blob(["second"], { type: "image/jpeg" });
        return await ctx.storage.store(blob);
      });

      const id1 = await t.mutation(api.uploads.mutations.saveFileMetadata, {
        storageId: storageId1,
        filename: "first.jpg",
        size: 100,
        contentType: "image/jpeg",
      });

      const id2 = await t.mutation(api.uploads.mutations.saveFileMetadata, {
        storageId: storageId2,
        filename: "second.jpg",
        size: 200,
        contentType: "image/jpeg",
      });

      const uploads = await t.query(api.uploads.queries.listUploads, {});

      expect(uploads).toHaveLength(2);
      expect(uploads[0]._id).toBe(id2); // Most recent first
      expect(uploads[1]._id).toBe(id1);
    });

    test("respects limit parameter", async () => {
      const t = convexTest(schema, modules);

      // Create 3 uploads
      for (let i = 0; i < 3; i++) {
        const storageId = await t.run(async (ctx) => {
          const blob = new Blob([`file${i}`], { type: "image/jpeg" });
          return await ctx.storage.store(blob);
        });

        await t.mutation(api.uploads.mutations.saveFileMetadata, {
          storageId,
          filename: `file${i}.jpg`,
          size: 100,
          contentType: "image/jpeg",
        });
      }

      const uploads = await t.query(api.uploads.queries.listUploads, {
        limit: 2,
      });

      expect(uploads).toHaveLength(2);
    });
  });

  describe("getUploadByStorageId", () => {
    test("finds upload by storage ID", async () => {
      const t = convexTest(schema, modules);

      const storageId = await t.run(async (ctx) => {
        const blob = new Blob(["findme"], { type: "image/jpeg" });
        return await ctx.storage.store(blob);
      });

      await t.mutation(api.uploads.mutations.saveFileMetadata, {
        storageId,
        filename: "findme.jpg",
        size: 1024,
        contentType: "image/jpeg",
      });

      const upload = await t.query(api.uploads.queries.getUploadByStorageId, {
        storageId,
      });

      expect(upload).toBeDefined();
      expect(upload?.filename).toBe("findme.jpg");
      expect(upload?.storageId).toBe(storageId);
    });

    test("returns null for non-existent storage ID", async () => {
      const t = convexTest(schema, modules);

      // Create a valid storage ID that doesn't have associated metadata
      const orphanedStorageId = await t.run(async (ctx) => {
        const blob = new Blob(["orphaned"], { type: "image/jpeg" });
        const id = await ctx.storage.store(blob);
        // Don't save metadata - this ID won't be in unauthenticatedUploads
        await ctx.storage.delete(id); // Clean up storage too
        return id;
      });

      const upload = await t.query(api.uploads.queries.getUploadByStorageId, {
        storageId: orphanedStorageId,
      });

      expect(upload).toBeNull();
    });
  });
});
