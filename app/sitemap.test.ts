import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";

const NOW = new Date("2026-09-19T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("sitemap", () => {
  it("publishes every public marketing route, excluding noindex auth pages", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://padel.example.com");

    expect(sitemap()).toEqual([
      {
        url: "https://padel.example.com",
        lastModified: NOW,
        changeFrequency: "weekly",
        priority: 1,
      },
      {
        url: "https://padel.example.com/terms",
        lastModified: NOW,
        changeFrequency: "yearly",
        priority: 0.2,
      },
      {
        url: "https://padel.example.com/privacy",
        lastModified: NOW,
        changeFrequency: "yearly",
        priority: 0.2,
      },
    ]);
  });

  it("falls back to the local development origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);

    expect(sitemap().map((entry) => entry.url)).toEqual([
      "http://localhost:3000",
      "http://localhost:3000/terms",
      "http://localhost:3000/privacy",
    ]);
  });
});
