import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("robots", () => {
  it("allows public pages while blocking private and API routes", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://padel.example.com");

    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/terms", "/privacy"],
        disallow: [
          "/dashboard",
          "/onboarding",
          "/api",
          "/sso-callback",
          "/invite-error",
        ],
      },
      sitemap: "https://padel.example.com/sitemap.xml",
    });
  });

  it("uses the local development origin when no app URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);

    expect(robots().sitemap).toBe("http://localhost:3000/sitemap.xml");
  });
});
