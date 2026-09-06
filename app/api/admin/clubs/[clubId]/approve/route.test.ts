import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  approveClub: vi.fn(),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { approveClub } from "@/core/clubs/services/clubs.service";
import { logAudit } from "@/core/audit/services/audit.service";
import { POST } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const approveClubMock = approveClub as ReturnType<typeof vi.fn>;
const logAuditMock = logAudit as ReturnType<typeof vi.fn>;

function makeParams(clubId = "club_1") {
  return { params: Promise.resolve({ clubId }) };
}

function makeRequest() {
  return new Request("http://localhost/api/admin/clubs/club_1/approve", {
    method: "POST",
  }) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/admin/clubs/[clubId]/approve", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    approveClubMock.mockReset();
    logAuditMock.mockReset();
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin", displayName: "Admin Person" },
    });
  });

  it("returns the auth failure response as-is when the caller is not an admin", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireAdminMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await POST(makeRequest(), makeParams());

    expect(response).toBe(forbidden);
    expect(approveClubMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the club doesn't exist", async () => {
    approveClubMock.mockResolvedValue({ status: "not_found" });

    const response = await POST(makeRequest(), makeParams("club_ghost"));

    expect(response.status).toBe(404);
    expect(logAuditMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the club is not currently PENDING", async () => {
    approveClubMock.mockResolvedValue({ status: "not_pending" });

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(409);
    expect(logAuditMock).not.toHaveBeenCalled();
  });

  it("approves a PENDING club and logs an audit entry with the admin's own identity", async () => {
    approveClubMock.mockResolvedValue({ status: "ok", clubId: "club_1" });

    const response = await POST(makeRequest(), makeParams("club_1"));

    expect(response.status).toBe(200);
    expect(approveClubMock).toHaveBeenCalledWith("club_1");
    expect(logAuditMock).toHaveBeenCalledWith({
      clubId: "club_1",
      userId: "user_admin",
      userDisplayName: "Admin Person",
      action: "club.approved",
      entity: "Club",
      entityId: "club_1",
    });
  });
});
