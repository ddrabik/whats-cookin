import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),

  // Unauthenticated file uploads (temporary storage before auth is implemented)
  unauthenticatedUploads: defineTable({
    // Storage ID reference to Convex's internal _storage table
    storageId: v.id("_storage"),
    // Original filename from client
    filename: v.string(),
    // File size in bytes
    size: v.number(),
    // MIME type (e.g., image/jpeg, application/pdf)
    contentType: v.string(),
    // Upload timestamp
    uploadDate: v.number(),
    // Optional: Client user agent for tracking
    uploadSource: v.optional(v.string()),
  })
    .index("by_storageId", ["storageId"])
    .index("by_uploadDate", ["uploadDate"])
    .index("by_contentType", ["contentType"]),
});
