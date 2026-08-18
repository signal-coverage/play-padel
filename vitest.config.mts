import { defineConfig } from "vitest/config";
import path from "node:path";

// Mirrors the "@/*" path alias from tsconfig.json's compilerOptions.paths so
// imports resolve identically under Vitest and under `tsc`/Next.js.
//
// The other two tsconfig paths ("odonto-next", "odonto-next/style.css") map
// to a .d.ts file and a .css file respectively — they exist purely for
// TypeScript's type-checker (ambient module declarations), not for runtime
// module resolution, so there's nothing meaningful to mirror here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
