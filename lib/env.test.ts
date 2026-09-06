import { describe, it, expect, vi, afterEach } from "vitest";
import { requireEnv, requireAppUrl } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireEnv", () => {
  it("returns the value when the env var is set", () => {
    vi.stubEnv("SOME_ENV_VAR", "some-value");

    expect(requireEnv("SOME_ENV_VAR")).toBe("some-value");
  });

  it("throws a clear error when the env var is unset", () => {
    vi.stubEnv("SOME_ENV_VAR", undefined);

    expect(() => requireEnv("SOME_ENV_VAR")).toThrow("SOME_ENV_VAR is not set");
  });

  it("throws a clear error when the env var is empty", () => {
    vi.stubEnv("SOME_ENV_VAR", "");

    expect(() => requireEnv("SOME_ENV_VAR")).toThrow("SOME_ENV_VAR is not set");
  });
});

describe("requireAppUrl", () => {
  it("returns NEXT_PUBLIC_APP_URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");

    expect(requireAppUrl()).toBe("https://app.example.com");
  });

  it("throws a clear error when NEXT_PUBLIC_APP_URL is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(() => requireAppUrl()).toThrow("NEXT_PUBLIC_APP_URL is not set");
  });
});
