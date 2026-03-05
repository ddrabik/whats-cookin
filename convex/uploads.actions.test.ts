import { describe, expect, test, vi } from "vitest";
import { buildInternalUploadErrorBody, getCorsHeaders } from "./uploads/actions";

function buildRequest(origin: string): Request {
  return new Request("https://example.com/upload", {
    method: "POST",
    headers: { origin },
  });
}

describe("Upload CORS headers", () => {
  test("allowed explicit origin is reflected", () => {
    const headers = getCorsHeaders(buildRequest("https://app.example.com"), {
      NODE_ENV: "production",
      APP_URL: "https://app.example.com",
    });

    expect(headers["Access-Control-Allow-Origin"]).toBe("https://app.example.com");
  });

  test("disallowed origin is not reflected", () => {
    const headers = getCorsHeaders(buildRequest("https://evil.example.com"), {
      NODE_ENV: "production",
      APP_URL: "https://app.example.com",
    });

    expect(headers["Access-Control-Allow-Origin"]).toBe("https://app.example.com");
  });

  test("localhost origin is allowed in development only", () => {
    const devHeaders = getCorsHeaders(buildRequest("http://localhost:5173"), {
      NODE_ENV: "development",
      APP_URL: "https://app.example.com",
    });
    const prodHeaders = getCorsHeaders(buildRequest("http://localhost:5173"), {
      NODE_ENV: "production",
      APP_URL: "https://app.example.com",
    });

    expect(devHeaders["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
    expect(prodHeaders["Access-Control-Allow-Origin"]).toBe("https://app.example.com");
  });

  test("warns in production when allowlist is empty and fallback origin is used", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const headers = getCorsHeaders(buildRequest("https://unknown.example.com"), {
      NODE_ENV: "production",
    });

    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:3006");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("Upload CORS allowlist is empty in production");
    warnSpy.mockRestore();
  });
});

describe("Upload error response", () => {
  test("internal error body does not expose backend exception text", () => {
    const body = buildInternalUploadErrorBody();

    expect(body).toEqual({
      error: "Internal server error during upload",
    });
    expect("message" in body).toBe(false);
  });
});
