import { describe, it, expect, vi, beforeEach } from "vitest";

const { findManyMock, countMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  countMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    auditLog: {
      findMany: findManyMock,
      count: countMock,
    },
  },
}));

import { listAuditLogs } from "./audit.service";

beforeEach(() => {
  findManyMock.mockReset();
  countMock.mockReset();
  findManyMock.mockResolvedValue([]);
  countMock.mockResolvedValue(0);
});

describe("listAuditLogs", () => {
  it("scopes to a single club when clubId is provided (existing behavior, unchanged)", async () => {
    await listAuditLogs("club-1", {});

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: "club-1" },
      }),
    );
    expect(countMock).toHaveBeenCalledWith({ where: { clubId: "club-1" } });
  });

  it("still applies entity/action filters alongside a real clubId", async () => {
    await listAuditLogs("club-1", { entity: "court", action: "court.created" });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: "club-1", entity: "court", action: "court.created" },
      }),
    );
  });

  it("returns entries across all clubs when clubId is omitted", async () => {
    const rows = [
      { id: "1", clubId: "club-1" },
      { id: "2", clubId: "club-2" },
    ];
    findManyMock.mockResolvedValue(rows);
    countMock.mockResolvedValue(2);

    const result = await listAuditLogs(undefined, {});

    expect(findManyMock.mock.calls[0][0].where).toEqual({});
    expect(countMock).toHaveBeenCalledWith({ where: {} });
    expect(result).toEqual({ logs: rows, total: 2 });
  });

  it("applies entity/action filters without a clubId filter when clubId is null", async () => {
    await listAuditLogs(null, { entity: "reservation" });

    expect(findManyMock.mock.calls[0][0].where).toEqual({
      entity: "reservation",
    });
  });
});
