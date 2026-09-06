import { describe, it, expect, vi, beforeEach } from "vitest";

const { createMock, findManyMock, findFirstMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    systemJobLog: {
      create: createMock,
      findMany: findManyMock,
      findFirst: findFirstMock,
    },
  },
}));

const { notifyAllAdminsMock } = vi.hoisted(() => ({
  notifyAllAdminsMock: vi.fn(),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  notifyAllAdmins: notifyAllAdminsMock,
}));

import {
  logSystemJob,
  listRecentSystemJobs,
  getLatestStatusPerJob,
} from "./systemJobs.service";
import { KNOWN_SYSTEM_JOBS } from "../consts";

const STARTED_AT = new Date("2026-09-04T10:00:00.000Z");
const FINISHED_AT = new Date("2026-09-04T10:00:01.000Z");

beforeEach(() => {
  createMock.mockReset();
  findManyMock.mockReset();
  findFirstMock.mockReset();
  notifyAllAdminsMock.mockReset();
  createMock.mockResolvedValue({});
  findManyMock.mockResolvedValue([]);
  findFirstMock.mockResolvedValue(null);
  notifyAllAdminsMock.mockResolvedValue(undefined);
});

describe("logSystemJob", () => {
  it("writes a row with the right shape for a successful run", async () => {
    await logSystemJob({
      kind: "CRON",
      name: "notifications",
      status: "SUCCESS",
      startedAt: STARTED_AT,
      finishedAt: FINISHED_AT,
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        kind: "CRON",
        name: "notifications",
        status: "SUCCESS",
        startedAt: STARTED_AT,
        finishedAt: FINISHED_AT,
        errorMessage: null,
      },
    });
  });

  it("writes the error message for a failed run", async () => {
    await logSystemJob({
      kind: "WEBHOOK",
      name: "mercadopago",
      status: "FAILURE",
      startedAt: STARTED_AT,
      finishedAt: FINISHED_AT,
      errorMessage: "boom",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "FAILURE",
        errorMessage: "boom",
      }),
    });
  });

  it("never throws when the write itself fails (would otherwise break the caller's own success/failure path)", async () => {
    createMock.mockRejectedValue(new Error("db down"));

    await expect(
      logSystemJob({
        kind: "CRON",
        name: "notifications",
        status: "SUCCESS",
        startedAt: STARTED_AT,
        finishedAt: FINISHED_AT,
      }),
    ).resolves.toBeUndefined();
  });

  it("broadcasts SYSTEM_JOB_FAILED to all admins on a FAILURE status", async () => {
    await logSystemJob({
      kind: "WEBHOOK",
      name: "mercadopago",
      status: "FAILURE",
      startedAt: STARTED_AT,
      finishedAt: FINISHED_AT,
      errorMessage: "boom",
    });

    expect(notifyAllAdminsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SYSTEM_JOB_FAILED",
        clubId: null,
        sendEmail: false,
      }),
    );
  });

  it("does not broadcast on a SUCCESS status", async () => {
    await logSystemJob({
      kind: "CRON",
      name: "notifications",
      status: "SUCCESS",
      startedAt: STARTED_AT,
      finishedAt: FINISHED_AT,
    });

    expect(notifyAllAdminsMock).not.toHaveBeenCalled();
  });

  it("still writes the job log even if the admin broadcast itself throws", async () => {
    notifyAllAdminsMock.mockRejectedValue(new Error("notify down"));

    await expect(
      logSystemJob({
        kind: "WEBHOOK",
        name: "mercadopago",
        status: "FAILURE",
        startedAt: STARTED_AT,
        finishedAt: FINISHED_AT,
        errorMessage: "boom",
      }),
    ).resolves.toBeUndefined();

    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

describe("listRecentSystemJobs", () => {
  it("orders newest first with no filters and a default limit of 50", async () => {
    await listRecentSystemJobs();

    expect(findManyMock).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  it("filters by kind when provided", async () => {
    await listRecentSystemJobs("CRON");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { kind: "CRON" } }),
    );
  });

  it("filters by kind and name when both provided, with a custom limit", async () => {
    await listRecentSystemJobs("WEBHOOK", "mercadopago", 10);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { kind: "WEBHOOK", name: "mercadopago" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  });

  it("returns whatever prisma returns", async () => {
    const rows = [{ id: "1" }, { id: "2" }];
    findManyMock.mockResolvedValue(rows);

    const result = await listRecentSystemJobs();

    expect(result).toBe(rows);
  });
});

describe("getLatestStatusPerJob", () => {
  it("queries every known job name and returns null for one that has never run", async () => {
    const result = await getLatestStatusPerJob();

    expect(findFirstMock).toHaveBeenCalledTimes(KNOWN_SYSTEM_JOBS.length);
    for (const { name } of KNOWN_SYSTEM_JOBS) {
      expect(result[name]).toBeNull();
    }
  });

  it("returns the single most recent row per job name", async () => {
    findFirstMock.mockImplementation(
      async ({ where }: { where: { kind: string; name: string } }) => {
        if (where.name === "notifications") {
          return {
            id: "log_1",
            kind: "CRON",
            name: "notifications",
            status: "SUCCESS",
            startedAt: STARTED_AT,
            finishedAt: FINISHED_AT,
            errorMessage: null,
            createdAt: FINISHED_AT,
          };
        }
        return null;
      },
    );

    const result = await getLatestStatusPerJob();

    expect(result.notifications).toEqual(
      expect.objectContaining({ id: "log_1", status: "SUCCESS" }),
    );
    expect(result.clerk).toBeNull();
  });

  it("queries newest-first per job so the single row returned is genuinely the latest", async () => {
    await getLatestStatusPerJob();

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });
});
