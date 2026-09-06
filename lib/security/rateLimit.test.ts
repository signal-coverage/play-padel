import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@vercel/firewall", () => ({
  checkRateLimit: vi.fn(),
}));

import { checkRateLimit } from "@vercel/firewall";
import { enforceRateLimit } from "./rateLimit";

const checkRateLimitMock = checkRateLimit as unknown as ReturnType<
  typeof vi.fn
>;

function makeRequest() {
  return new Request("https://app.example.com/api/onboarding");
}

describe("enforceRateLimit", () => {
  beforeEach(() => {
    checkRateLimitMock.mockReset();
  });

  it("returns null (allow) when checkRateLimit reports rateLimited: false", async () => {
    checkRateLimitMock.mockResolvedValue({ rateLimited: false });

    const result = await enforceRateLimit(makeRequest(), "onboarding", "u1");

    expect(result).toBeNull();
  });

  it("calls checkRateLimit against the shared api-guard rule, namespacing the key by route + identity", async () => {
    checkRateLimitMock.mockResolvedValue({ rateLimited: false });
    const request = makeRequest();

    await enforceRateLimit(request, "onboarding", "u1");

    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "api-guard",
      expect.objectContaining({ request, rateLimitKey: "onboarding:u1" }),
    );
  });

  it("returns a 429 JSON response when checkRateLimit reports rateLimited: true", async () => {
    checkRateLimitMock.mockResolvedValue({ rateLimited: true });

    const result = await enforceRateLimit(makeRequest(), "onboarding", "u1");

    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    const body = await result!.json();
    expect(body).toEqual({ error: "Too many requests" });
  });
});
