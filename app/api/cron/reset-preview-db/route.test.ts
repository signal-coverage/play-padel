import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { logSystemJobMock, fetchMock } = vi.hoisted(() => ({
  logSystemJobMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@/core/systemJobs/services/systemJobs.service", () => ({
  logSystemJob: logSystemJobMock,
}));

vi.stubGlobal("fetch", fetchMock);

import { GET } from "./route";

const FAKE_CRON_SECRET = "fake-cron-secret-for-tests";
const FAKE_NEON_KEY = "fake-neon-api-key-for-tests";

function makeRequest(authHeader?: string) {
  return new Request("https://app.example.com/api/cron/reset-preview-db", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", FAKE_CRON_SECRET);
  vi.stubEnv("NEON_API_KEY", FAKE_NEON_KEY);
  logSystemJobMock.mockReset();
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function authorizedRequest() {
  return makeRequest(`Bearer ${FAKE_CRON_SECRET}`);
}

describe("GET /api/cron/reset-preview-db", () => {
  it("rejects requests without the correct CRON_SECRET bearer token", async () => {
    const response = await GET(makeRequest("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 500 and logs a FAILURE system job when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(makeRequest("Bearer anything"));

    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls Neon's restore endpoint with the preview branch as target and main as source_branch_id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ branch: { id: "br-weathered-dawn-afw089c0" } }),
    });

    const response = await GET(authorizedRequest());

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/projects/muddy-frost-80748034/branches/br-weathered-dawn-afw089c0/restore",
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${FAKE_NEON_KEY}`,
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ source_branch_id: "br-proud-dream-af3s8vw7" });
    expect(response.status).toBe(200);
  });

  it("logs a SUCCESS system job entry on a successful reset", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ branch: {} }),
    });

    await GET(authorizedRequest());

    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "CRON",
        name: "reset-preview-db",
        status: "SUCCESS",
      }),
    );
  });

  it("logs a FAILURE system job and propagates the error when Neon's API responds with a non-OK status", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "source_branch_id is invalid",
    });

    await expect(GET(authorizedRequest())).rejects.toThrow();

    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "CRON",
        name: "reset-preview-db",
        status: "FAILURE",
        errorMessage: expect.stringContaining("400"),
      }),
    );
  });
});
