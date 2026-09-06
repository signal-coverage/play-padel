import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/core/systemJobs/services/systemJobs.service", () => ({
  listRecentSystemJobs: vi.fn(),
  getLatestStatusPerJob: vi.fn(),
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import {
  listRecentSystemJobs,
  getLatestStatusPerJob,
} from "@/core/systemJobs/services/systemJobs.service";
import { GET } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const listRecentSystemJobsMock = listRecentSystemJobs as ReturnType<
  typeof vi.fn
>;
const getLatestStatusPerJobMock = getLatestStatusPerJob as ReturnType<
  typeof vi.fn
>;

beforeEach(() => {
  requireAdminMock.mockReset();
  listRecentSystemJobsMock.mockReset();
  getLatestStatusPerJobMock.mockReset();
  requireAdminMock.mockResolvedValue({
    ok: true,
    context: { userId: "user_admin", displayName: "Admin" },
  });
  listRecentSystemJobsMock.mockResolvedValue([]);
  getLatestStatusPerJobMock.mockResolvedValue({});
});

describe("GET /api/admin/system-status", () => {
  it("returns the auth failure response as-is when the caller is not an admin", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireAdminMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET();

    expect(response).toBe(forbidden);
    expect(listRecentSystemJobsMock).not.toHaveBeenCalled();
    expect(getLatestStatusPerJobMock).not.toHaveBeenCalled();
  });

  it("returns the summary (latest per job) and recent activity when authorized", async () => {
    const summary = {
      notifications: null,
      "membership-grace-sweep": null,
      "mercadopago-token-refresh": null,
      mercadopago: null,
      clerk: null,
    };
    const recent = [{ id: "log_1", name: "notifications", status: "SUCCESS" }];
    getLatestStatusPerJobMock.mockResolvedValue(summary);
    listRecentSystemJobsMock.mockResolvedValue(recent);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ summary, recent });
  });

  it("requests the recent activity list with the default limit, unfiltered", async () => {
    await GET();

    expect(listRecentSystemJobsMock).toHaveBeenCalledWith();
  });
});
