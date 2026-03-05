import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import {
  FileValidationError,
  validateFileSize,
  validateFileUpload,
  validateFilename,
  validateMimeType,
} from "./uploads/validation";
import { MAX_FILE_SIZE } from "./uploads/constants";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("File Upload Validation", () => {
  test("accepts files under 10MB", () => {
    const result = validateFileSize(5 * 1024 * 1024);
    expect(result.valid).toBe(true);
  });

  test("rejects files over 10MB", () => {
    const result = validateFileSize(MAX_FILE_SIZE + 1);
    expect(result.valid).toBe(false);
    expect(result.error).toBeInstanceOf(FileValidationError);
  });

  test("accepts allowed mime types", () => {
    expect(validateMimeType("image/jpeg").valid).toBe(true);
    expect(validateMimeType("image/png").valid).toBe(true);
    expect(validateMimeType("image/webp").valid).toBe(true);
  });

  test("rejects invalid mime types", () => {
    expect(validateMimeType("video/mp4").valid).toBe(false);
  });

  test("rejects empty filename", () => {
    expect(validateFilename("").valid).toBe(false);
  });

  test("validates file upload end-to-end", () => {
    const blob = new Blob(["test"], { type: "image/jpeg" });
    Object.defineProperty(blob, "size", { value: 1024 });
    expect(validateFileUpload(blob, "recipe.jpg").valid).toBe(true);
  });
});

describe("Upload authorization", () => {
  test("unauthenticated saveFileMetadata is rejected", async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["test"], { type: "image/jpeg" }))
    );

    await expect(
      t.mutation(api.uploads.mutations.saveFileMetadata, {
        storageId,
        filename: "test.jpg",
        size: 1024,
        contentType: "image/jpeg",
      })
    ).rejects.toThrow("Not authenticated");
  });

  test("user cannot read another user's upload", async () => {
    const harness = convexTest(schema, modules);
    const userA = harness.withIdentity({ subject: "user_a" });
    const userB = harness.withIdentity({ subject: "user_b" });

    const storageId = await userA.run(async (ctx) =>
      ctx.storage.store(new Blob(["a"], { type: "image/jpeg" }))
    );

    const uploadId = await userA.mutation(api.uploads.mutations.saveFileMetadata, {
      storageId,
      filename: "a.jpg",
      size: 100,
      contentType: "image/jpeg",
    });

    const result = await userB.query(api.uploads.queries.getUpload, { uploadId });
    expect(result).toBeNull();
  });

  test("listUploads returns only current user's uploads", async () => {
    const harness = convexTest(schema, modules);
    const userA = harness.withIdentity({ subject: "user_a" });
    const userB = harness.withIdentity({ subject: "user_b" });

    const storageA = await userA.run(async (ctx) =>
      ctx.storage.store(new Blob(["a"], { type: "image/jpeg" }))
    );
    const storageB = await userB.run(async (ctx) =>
      ctx.storage.store(new Blob(["b"], { type: "image/jpeg" }))
    );

    await userA.mutation(api.uploads.mutations.saveFileMetadata, {
      storageId: storageA,
      filename: "a.jpg",
      size: 100,
      contentType: "image/jpeg",
    });
    await userB.mutation(api.uploads.mutations.saveFileMetadata, {
      storageId: storageB,
      filename: "b.jpg",
      size: 200,
      contentType: "image/jpeg",
    });

    const aUploads = await userA.query(api.uploads.queries.listUploads, {});
    const bUploads = await userB.query(api.uploads.queries.listUploads, {});

    expect(aUploads).toHaveLength(1);
    expect(aUploads[0]?.filename).toBe("a.jpg");
    expect(bUploads).toHaveLength(1);
    expect(bUploads[0]?.filename).toBe("b.jpg");
  });
});
