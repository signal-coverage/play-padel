import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { logSystemJobMock } = vi.hoisted(() => ({
  logSystemJobMock: vi.fn(),
}));

vi.mock("@/core/systemJobs/services/systemJobs.service", () => ({
  logSystemJob: logSystemJobMock,
}));

import { requireCronSecret } from "./requireCronSecret";

function makeRequest(authHeader: string | null) {
  const headers = new Headers();
  if (authHeader !== null) headers.set("authorization", authHeader);
  return new Request("https://app.example.com/api/cron/some-job", {
    headers,
  });
}

beforeEach(() => {
  logSystemJobMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireCronSecret", () => {
  it("returns 500 and logs a FAILURE system job — not a silent 401 — when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await requireCronSecret(
      makeRequest("Bearer anything"),
      "some-job",
    );

    expect(response).not.toBeNull();
    expect(response!.status).toBe(500);
    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "CRON",
        name: "some-job",
        status: "FAILURE",
        errorMessage: expect.stringContaining("CRON_SECRET"),
      }),
    );
  });

  it("returns 401 and does NOT log a system job when CRON_SECRET is set but the bearer token doesn't match", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");

    const response = await requireCronSecret(
      makeRequest("Bearer wrong-secret"),
      "some-job",
    );

    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
    expect(logSystemJobMock).not.toHaveBeenCalled();
  });

  it("returns null (authorized) when CRON_SECRET is set and the bearer token matches", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");

    const response = await requireCronSecret(
      makeRequest("Bearer the-real-secret"),
      "some-job",
    );

    expect(response).toBeNull();
    expect(logSystemJobMock).not.toHaveBeenCalled();
  });
});
