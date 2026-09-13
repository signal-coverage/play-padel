import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/infrastructure/db/client";
import { GET } from "./route";

const queryRawMock = prisma.$queryRaw as ReturnType<typeof vi.fn>;

describe("GET /api/health", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("returns 200 with status ok when the database is reachable", async () => {
    queryRawMock.mockResolvedValue([{ result: 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("returns 503 with status error when the database check fails", async () => {
    queryRawMock.mockRejectedValue(new Error("connection refused"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
  });
});
