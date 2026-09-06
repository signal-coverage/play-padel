import { describe, it, expect, vi, beforeEach } from "vitest";

const { listAuditLogsMock } = vi.hoisted(() => ({
  listAuditLogsMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  listAuditLogs: listAuditLogsMock,
}));

import { prisma } from "@/infrastructure/db/client";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { GET } from "./route";

const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const authMock = auth as unknown as ReturnType<typeof vi.fn>;

function makeRequest(query = "") {
  return new NextRequest(
    `https://app.example.com/api/admin/audit-logs${query}`,
  );
}

beforeEach(() => {
  findUniqueMock.mockReset();
  authMock.mockReset();
  listAuditLogsMock.mockReset();
  authMock.mockResolvedValue({ userId: "user_admin" });
  findUniqueMock.mockResolvedValue({ isAdmin: true });
  listAuditLogsMock.mockResolvedValue({ logs: [], total: 0 });
});

describe("GET /api/admin/audit-logs", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(listAuditLogsMock).not.toHaveBeenCalled();
  });

  it("returns 403 when signed in but not an admin", async () => {
    findUniqueMock.mockResolvedValue({ isAdmin: false });

    const response = await GET(makeRequest());

    expect(response.status).toBe(403);
    expect(listAuditLogsMock).not.toHaveBeenCalled();
  });

  it("calls listAuditLogs with no clubId (global, cross-club view)", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(listAuditLogsMock).toHaveBeenCalledWith(undefined, {});
  });

  it("forwards entity/action/page/pageSize query params as filters", async () => {
    await GET(
      makeRequest("?entity=court&action=court.created&page=2&pageSize=10"),
    );

    expect(listAuditLogsMock).toHaveBeenCalledWith(undefined, {
      entity: "court",
      action: "court.created",
      page: 2,
      pageSize: 10,
    });
  });

  it("returns the logs/total payload from listAuditLogs", async () => {
    const logs = [{ id: "1" }];
    listAuditLogsMock.mockResolvedValue({ logs, total: 1 });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body).toEqual({ logs, total: 1 });
  });
});
