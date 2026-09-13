import { describe, it, expect, vi, beforeEach } from "vitest";

// Every action module this file might import — mocked so main() never
// touches a real database, Clerk, or subprocess. Each export is a bare
// vi.fn() the individual tests configure per-case.
const {
  askChoiceOrBackMock,
  askChoiceMock,
  askTextMock,
  askConfirmMock,
  introMock,
  outroMock,
  logMock,
  noteMock,
  cancelAndExitMock,
  grantAdminMock,
  reconcileAdminFlagsMock,
  applyMigrationsMock,
  BACK,
} = vi.hoisted(() => ({
  askChoiceOrBackMock: vi.fn(),
  askChoiceMock: vi.fn(),
  askTextMock: vi.fn(),
  askConfirmMock: vi.fn(),
  introMock: vi.fn(),
  outroMock: vi.fn(),
  logMock: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), success: vi.fn() },
  noteMock: vi.fn(),
  cancelAndExitMock: vi.fn(),
  grantAdminMock: vi.fn(),
  reconcileAdminFlagsMock: vi.fn(),
  applyMigrationsMock: vi.fn(),
  BACK: Symbol("back"),
}));

vi.mock("./lib/prompt", () => ({
  askChoiceOrBack: askChoiceOrBackMock,
  askChoice: askChoiceMock,
  askText: askTextMock,
  askConfirm: askConfirmMock,
  BACK,
  cancelAndExit: cancelAndExitMock,
  intro: introMock,
  outro: outroMock,
  log: logMock,
  note: noteMock,
}));

vi.mock("./lib/style", () => ({
  describeTarget: () => "mock-target",
}));

vi.mock("dotenv", () => ({
  config: vi.fn().mockReturnValue({}),
}));

vi.mock("./actions/grant-admin", () => ({ grantAdmin: grantAdminMock }));
vi.mock("./actions/reconcile-admin-flags", () => ({
  reconcileAdminFlags: reconcileAdminFlagsMock,
}));
vi.mock("./actions/apply-migrations", () => ({
  applyMigrations: applyMigrationsMock,
}));

const ACTION_QUESTION = "What do you want to do?";
const DB_QUESTION = "Which database do you want to target?";

// menu.ts keeps `activeEnvFile` as module-level state (deliberately, so it
// survives across actions within one real `npm run manage` run) — which
// means it would just as easily leak ACROSS test cases if they all shared
// one static import of the module. vi.resetModules() + a fresh dynamic
// import per test gives every test its own module instance instead, same
// as a real fresh process gets.
let main: () => Promise<void>;

beforeEach(async () => {
  vi.resetModules();
  askChoiceOrBackMock.mockReset();
  askChoiceMock.mockReset();
  askTextMock.mockReset();
  askConfirmMock.mockReset();
  introMock.mockReset();
  outroMock.mockReset();
  noteMock.mockReset();
  cancelAndExitMock.mockReset();
  logMock.info.mockReset();
  grantAdminMock.mockReset().mockResolvedValue(undefined);
  reconcileAdminFlagsMock.mockReset().mockResolvedValue(undefined);
  applyMigrationsMock.mockReset().mockResolvedValue(undefined);
  askTextMock.mockResolvedValue("owner@club.com");

  ({ main } = await import("./menu"));
});

// Drives askChoiceOrBack by matching on the question text, since main()
// asks several different questions with the same mocked function — each
// test supplies only the answers relevant to its own scenario, in the
// order the loop will actually ask them.
function scriptAskChoiceOrBack(
  answers: Record<string, (string | typeof BACK)[]>,
) {
  const remaining: Record<string, (string | typeof BACK)[]> =
    Object.fromEntries(Object.entries(answers).map(([q, a]) => [q, [...a]]));
  askChoiceOrBackMock.mockImplementation(async (message: string) => {
    const queue = remaining[message];
    if (!queue || queue.length === 0) {
      throw new Error(`No scripted answer left for question: "${message}"`);
    }
    return queue.shift();
  });
}

describe("main", () => {
  it("returns to the top-level menu after an action finishes, instead of ending the process", async () => {
    scriptAskChoiceOrBack({
      [ACTION_QUESTION]: ["reconcile-admin", "exit"],
      [DB_QUESTION]: [".env.local"],
    });

    await main();

    expect(reconcileAdminFlagsMock).toHaveBeenCalledTimes(1);
    // Asked "what do you want to do" twice: once for reconcile-admin, once
    // more afterward (proving the loop came back) before Exit was picked.
    expect(
      askChoiceOrBackMock.mock.calls.filter(([q]) => q === ACTION_QUESTION),
    ).toHaveLength(2);
    expect(outroMock).toHaveBeenCalled();
    expect(cancelAndExitMock).not.toHaveBeenCalled();
  });

  it("stops the loop and prints the outro when Exit is chosen", async () => {
    scriptAskChoiceOrBack({ [ACTION_QUESTION]: ["exit"] });

    await main();

    expect(outroMock).toHaveBeenCalled();
    expect(grantAdminMock).not.toHaveBeenCalled();
  });

  it("asks which database only once across two Prisma-backed actions in the same run", async () => {
    scriptAskChoiceOrBack({
      [ACTION_QUESTION]: ["grant-admin", "reconcile-admin", "exit"],
      [DB_QUESTION]: [".env.local"],
    });

    await main();

    expect(grantAdminMock).toHaveBeenCalledTimes(1);
    expect(reconcileAdminFlagsMock).toHaveBeenCalledTimes(1);
    expect(
      askChoiceOrBackMock.mock.calls.filter(([q]) => q === DB_QUESTION),
    ).toHaveLength(1);
  });

  it("lets apply-migrations ask which database on every call, since it doesn't share the Prisma singleton", async () => {
    scriptAskChoiceOrBack({
      [ACTION_QUESTION]: ["apply-migrations", "apply-migrations", "exit"],
      "Apply pending migrations to which database?": [
        ".env.preview",
        ".env.prod",
      ],
    });

    await main();

    expect(applyMigrationsMock).toHaveBeenNthCalledWith(1, ".env.preview");
    expect(applyMigrationsMock).toHaveBeenNthCalledWith(2, ".env.prod");
  });
});
