import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

// resetAllData() is the subprocess-driving orchestrator — covered here in
// isolation from listResettableTables/wipeAllData (the low-level,
// single-connection SQL primitives reset-data-worker.ts calls in its own
// process; nothing in THIS file ever touches a real DATABASE_URL).
const { spawnMock, askConfirmMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  askConfirmMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({ spawn: spawnMock }));
vi.mock("../lib/prompt", () => ({
  askConfirm: askConfirmMock,
  log: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), message: vi.fn() },
  note: vi.fn(),
  withSpinner: async (_msg: string, task: () => Promise<unknown>) => task(),
}));

import { resetAllData } from "./reset-data";

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

function queueWorkerResult(stdout: string, code: number) {
  // Scheduled from INSIDE the mock implementation (at the exact moment
  // spawn() is called), same reasoning as apply-migrations.test.ts's own
  // queueCliResult — runWorker attaches its .on(...) listeners synchronously
  // right after spawn() returns.
  spawnMock.mockImplementationOnce(() => {
    const child = makeFakeChild();
    queueMicrotask(() => {
      if (stdout) child.stdout.emit("data", Buffer.from(stdout));
      child.emit("close", code);
    });
    return child;
  });
}

beforeEach(() => {
  spawnMock.mockReset();
  askConfirmMock.mockReset();
});

describe("resetAllData", () => {
  it("spawns a fresh worker process pointed at the given env file to list tables", async () => {
    queueWorkerResult("TABLES:clubs,reservations", 0);
    askConfirmMock.mockResolvedValue(false);

    await resetAllData(".env.preview");

    expect(spawnMock).toHaveBeenCalledTimes(1); // list only, wipe skipped
    const [, args] = spawnMock.mock.calls[0];
    expect(args).toEqual(
      expect.arrayContaining([
        "tsx",
        expect.stringContaining("reset-data-worker"),
        ".env.preview",
      ]),
    );
  });

  it("never asks to confirm when the database has no resettable tables", async () => {
    queueWorkerResult("TABLES:", 0);

    await resetAllData(".env.preview");

    expect(askConfirmMock).not.toHaveBeenCalled();
  });

  it("asks for confirmation, naming the target database, before wiping", async () => {
    queueWorkerResult("TABLES:clubs,reservations", 0);
    askConfirmMock.mockResolvedValue(false);

    await resetAllData(".env.preview");

    expect(askConfirmMock).toHaveBeenCalledWith(
      expect.stringContaining(".env.preview"),
      false,
    );
  });

  it("uses starker PRODUCTION wording for .env.prod", async () => {
    queueWorkerResult("TABLES:clubs,reservations", 0);
    askConfirmMock.mockResolvedValue(false);

    await resetAllData(".env.prod");

    expect(askConfirmMock).toHaveBeenCalledWith(
      expect.stringContaining("PRODUCTION"),
      false,
    );
  });

  it("wipes only after explicit confirmation, via a second worker invocation with --wipe", async () => {
    queueWorkerResult("TABLES:clubs,reservations", 0);
    askConfirmMock.mockResolvedValue(true);
    queueWorkerResult("", 0);

    await resetAllData(".env.preview");

    expect(spawnMock).toHaveBeenCalledTimes(2);
    const [, secondArgs] = spawnMock.mock.calls[1];
    expect(secondArgs).toEqual(
      expect.arrayContaining([".env.preview", "--wipe"]),
    );
  });

  it("never wipes when the user declines", async () => {
    queueWorkerResult("TABLES:clubs,reservations", 0);
    askConfirmMock.mockResolvedValue(false);

    await resetAllData(".env.preview");

    expect(spawnMock).toHaveBeenCalledTimes(1); // list only
  });

  it("targeting .env.prod actually spawns the worker with .env.prod, never a leftover .env.local", async () => {
    queueWorkerResult("TABLES:clubs", 0);
    askConfirmMock.mockResolvedValue(true);
    queueWorkerResult("", 0);

    await resetAllData(".env.prod");

    for (const [, args] of spawnMock.mock.calls) {
      expect(args).toContain(".env.prod");
      expect(args).not.toContain(".env.local");
    }
  });
});
