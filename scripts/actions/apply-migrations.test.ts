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

import { applyMigrations } from "./apply-migrations";

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
});
