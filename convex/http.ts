import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { handleUpload } from "./uploads/actions";

const http = httpRouter();

/**
 * File upload endpoint
 * POST /upload with multipart/form-data
 * Accepts: file (File), filename (optional string)
 */
http.route({
  path: "/upload",
  method: "POST",
  handler: handleUpload,
});

/**
 * CORS preflight handler for upload endpoint
 * Allows cross-origin uploads from frontend
 */
http.route({
  path: "/upload",
  method: "OPTIONS",
  // eslint-disable-next-line @typescript-eslint/require-await
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

export default http;
