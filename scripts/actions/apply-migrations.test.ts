import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

const { spawnMock, writeFileMock, rmMock, askConfirmMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  writeFileMock: vi.fn(),
  rmMock: vi.fn(),
  askConfirmMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({ spawn: spawnMock }));
vi.mock("node:fs/promises", () => ({
  default: { writeFile: writeFileMock, rm: rmMock },
  writeFile: writeFileMock,
  rm: rmMock,
}));
vi.mock("../lib/prompt", () => ({
  askConfirm: askConfirmMock,
  log: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), message: vi.fn() },
  note: vi.fn(),
  withSpinner: async (_msg: string, task: () => Promise<unknown>) => task(),
}));

import {
  applyMigrations,
  applyMigrationsToAllEnvironments,
} from "./apply-migrations";

/** Simulates a child_process ChildProcess good enough for this module's needs. */
function makeFakeChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  return child;
}

function queueCliResult(stdout: string, code: number) {
  // Scheduled from INSIDE the mock implementation (called at the exact
  // moment spawn() executes), not beforehand — runPrismaCli attaches its
  // .on(...) listeners synchronously right after spawn() returns, so
  // firing events any earlier than that would be lost (EventEmitter never
  // replays an event to a listener added after it already fired).
  spawnMock.mockImplementationOnce(() => {
    const child = makeFakeChild();
    queueMicrotask(() => {
      if (stdout) child.stdout.emit("data", Buffer.from(stdout));
      child.emit("close", code);
    });
    return child;
  });
}

const UP_TO_DATE_OUTPUT =
  "33 migrations found in prisma/migrations\n\nDatabase schema is up to date!\n";
const PENDING_OUTPUT = `33 migrations found in prisma/migrations
Following migrations have not yet been applied:
20260913050000_add_club_slug

To apply migrations in production run prisma migrate deploy.`;

beforeEach(() => {
  spawnMock.mockReset();
  writeFileMock.mockReset().mockResolvedValue(undefined);
  rmMock.mockReset().mockResolvedValue(undefined);
  askConfirmMock.mockReset();
});

describe("applyMigrations", () => {
  it("writes a throwaway config pointing at the chosen env file, and always removes it", async () => {
    queueCliResult(UP_TO_DATE_OUTPUT, 0);

    await applyMigrations(".env.preview");

    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining("prisma.config.migrate-tmp.ts"),
      expect.stringContaining('".env.preview"'),
      "utf8",
    );
    expect(rmMock).toHaveBeenCalledWith(
      expect.stringContaining("prisma.config.migrate-tmp.ts"),
      { force: true },
    );
  });

  it("reports up-to-date and never asks to deploy when nothing is pending", async () => {
    queueCliResult(UP_TO_DATE_OUTPUT, 0);

    await applyMigrations(".env.preview");

    expect(askConfirmMock).not.toHaveBeenCalled();
    expect(spawnMock).toHaveBeenCalledTimes(1); // status only, no deploy
  });

  it("asks for confirmation before deploying when migrations are pending", async () => {
    queueCliResult(PENDING_OUTPUT, 1);
    askConfirmMock.mockResolvedValue(false);

    await applyMigrations(".env.preview");

    expect(askConfirmMock).toHaveBeenCalledWith(
      expect.stringContaining(".env.preview"),
      false,
    );
    expect(spawnMock).toHaveBeenCalledTimes(1); // status only, deploy skipped
  });

  it("uses starker wording for .env.prod", async () => {
    queueCliResult(PENDING_OUTPUT, 1);
    askConfirmMock.mockResolvedValue(false);

    await applyMigrations(".env.prod");

    expect(askConfirmMock).toHaveBeenCalledWith(
      expect.stringContaining("PRODUCTION"),
      false,
    );
  });

  it("runs migrate deploy only after explicit confirmation", async () => {
    queueCliResult(PENDING_OUTPUT, 1);
    askConfirmMock.mockResolvedValue(true);
    queueCliResult("All migrations have been successfully applied.", 0);

    await applyMigrations(".env.preview");

    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(spawnMock.mock.calls[1][1]).toEqual(
      expect.arrayContaining(["migrate", "deploy"]),
    );
  });

  it("removes the temp config even when the CLI call throws", async () => {
    spawnMock.mockImplementationOnce(() => {
      throw new Error("spawn failed");
    });

    await expect(applyMigrations(".env.preview")).rejects.toThrow();
    expect(rmMock).toHaveBeenCalled();
  });

  it("resolves true when already up to date, and false when the deploy fails", async () => {
    queueCliResult(UP_TO_DATE_OUTPUT, 0);
    await expect(applyMigrations(".env.preview")).resolves.toBe(true);

    queueCliResult(PENDING_OUTPUT, 1);
    askConfirmMock.mockResolvedValue(true);
    queueCliResult("Error: something went wrong", 1);
    await expect(applyMigrations(".env.preview")).resolves.toBe(false);
  });
});

describe("applyMigrationsToAllEnvironments", () => {
  it("walks local, then preview, then prod, in that order", async () => {
    queueCliResult(UP_TO_DATE_OUTPUT, 0); // local status
    queueCliResult(UP_TO_DATE_OUTPUT, 0); // preview status
    queueCliResult(UP_TO_DATE_OUTPUT, 0); // prod status

    await applyMigrationsToAllEnvironments();

    expect(spawnMock).toHaveBeenCalledTimes(3);
    expect(writeFileMock.mock.calls[0][1]).toEqual(
      expect.stringContaining('".env.local"'),
    );
    expect(writeFileMock.mock.calls[1][1]).toEqual(
      expect.stringContaining('".env.preview"'),
    );
    expect(writeFileMock.mock.calls[2][1]).toEqual(
      expect.stringContaining('".env.prod"'),
    );
  });

  it("stops before prod when preview is declined, and never touches prod", async () => {
    queueCliResult(UP_TO_DATE_OUTPUT, 0); // local status — up to date
    queueCliResult(PENDING_OUTPUT, 1); // preview status — pending
    askConfirmMock.mockResolvedValue(false); // declined

    await applyMigrationsToAllEnvironments();

    // local status, preview status only — no preview deploy, no prod call at all
    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(writeFileMock.mock.calls).toHaveLength(2);
  });

  it("stops after a deploy failure instead of continuing to the next environment", async () => {
    queueCliResult(PENDING_OUTPUT, 1); // local status — pending
    askConfirmMock.mockResolvedValue(true);
    queueCliResult("Error: something went wrong", 1); // local deploy fails

    await applyMigrationsToAllEnvironments();

    expect(spawnMock).toHaveBeenCalledTimes(2); // local status + failed deploy only
    expect(writeFileMock.mock.calls).toHaveLength(1);
  });
});
