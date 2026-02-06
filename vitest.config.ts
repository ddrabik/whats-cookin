import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["convex/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["convex/uploads/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["convex/_generated/**", "convex/**/*.test.ts", "src/**/*.test.ts"],
    },
  },
});
