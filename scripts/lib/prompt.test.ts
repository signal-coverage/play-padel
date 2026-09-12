import { describe, it, expect, vi, beforeEach } from "vitest";

const { selectMock, isCancelMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  isCancelMock: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  select: selectMock,
  isCancel: isCancelMock,
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
  spinner: vi.fn(),
  log: {},
  note: vi.fn(),
}));

import { askChoiceOrBack, BACK } from "./prompt";

beforeEach(() => {
  selectMock.mockReset();
  isCancelMock.mockReset();
});

describe("askChoiceOrBack", () => {
  it("returns the selected value when the user picks an option", async () => {
    selectMock.mockResolvedValue("grant-admin");
    isCancelMock.mockReturnValue(false);

    const result = await askChoiceOrBack("What do you want to do?", [
      { value: "grant-admin", label: "Grant admin access" },
    ]);

    expect(result).toBe("grant-admin");
  });

  // Otherwise nothing on screen tells the user Esc is even an option here —
  // askChoice's prompts never mention it because, for those, it just exits.
  it("tells the user Esc goes back, appended to the message it's given", async () => {
    selectMock.mockResolvedValue("grant-admin");
    isCancelMock.mockReturnValue(false);

    await askChoiceOrBack("What do you want to do?", [
      { value: "grant-admin", label: "Grant admin access" },
    ]);

    const call = selectMock.mock.calls[0][0];
    expect(call.message).toContain("What do you want to do?");
    expect(call.message).toContain("Esc to go back");
  });

  // The whole point of this variant over askChoice: cancelling (Esc/Ctrl+C)
  // returns a value the caller can react to (loop back to a previous
  // question) instead of unconditionally exiting the process.
  it("returns the BACK sentinel instead of exiting when the prompt is cancelled", async () => {
    selectMock.mockResolvedValue(Symbol("clack-cancel"));
    isCancelMock.mockReturnValue(true);

    const result = await askChoiceOrBack("What do you want to do?", [
      { value: "grant-admin", label: "Grant admin access" },
    ]);

    expect(result).toBe(BACK);
  });
});
