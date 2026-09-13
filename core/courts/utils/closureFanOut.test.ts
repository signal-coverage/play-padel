import { describe, it, expect } from "vitest";
import { summarizeClosureFanOut } from "./closureFanOut";

function fulfilled(
  value: unknown = undefined,
): PromiseFulfilledResult<unknown> {
  return { status: "fulfilled", value };
}

function rejected(reason: unknown): PromiseRejectedResult {
  return { status: "rejected", reason };
}

describe("summarizeClosureFanOut", () => {
  it("reports a single-court success without pluralizing the message", () => {
    const outcome = summarizeClosureFanOut([fulfilled()]);

    expect(outcome).toEqual({
      totalCount: 1,
      succeededCount: 1,
      failedCount: 0,
      allSucceeded: true,
      allFailed: false,
      toastTone: "success",
      toastMessage: "Closure created",
    });
  });

  it("reports a multi-court success with the court count", () => {
    const outcome = summarizeClosureFanOut([
      fulfilled(),
      fulfilled(),
      fulfilled(),
    ]);

    expect(outcome.allSucceeded).toBe(true);
    expect(outcome.toastTone).toBe("success");
    expect(outcome.toastMessage).toBe("Closure created for 3 courts");
  });

  it("surfaces the first rejection's message when every attempt fails", () => {
    const outcome = summarizeClosureFanOut([
      rejected(new Error("Court is closed for maintenance")),
      rejected(new Error("Another conflict")),
    ]);

    expect(outcome.allSucceeded).toBe(false);
    expect(outcome.allFailed).toBe(true);
    expect(outcome.toastTone).toBe("error");
    expect(outcome.toastMessage).toBe("Court is closed for maintenance");
  });

  it("falls back to a generic message when the first rejection isn't an Error", () => {
    const outcome = summarizeClosureFanOut([rejected("boom")]);

    expect(outcome.toastMessage).toBe("Failed to create closure");
  });

  it("reports a partial failure with succeeded/failed counts", () => {
    const outcome = summarizeClosureFanOut([
      fulfilled(),
      fulfilled(),
      rejected(new Error("conflict")),
    ]);

    expect(outcome.succeededCount).toBe(2);
    expect(outcome.failedCount).toBe(1);
    expect(outcome.allSucceeded).toBe(false);
    expect(outcome.allFailed).toBe(false);
    expect(outcome.toastTone).toBe("error");
    expect(outcome.toastMessage).toBe(
      "Created for 2 of 3 courts. 1 conflicted — check each court's closures.",
    );
  });

  it("treats an empty result list as a (vacuous) success, not a failure", () => {
    const outcome = summarizeClosureFanOut([]);

    expect(outcome.allSucceeded).toBe(true);
    expect(outcome.allFailed).toBe(false);
    expect(outcome.toastTone).toBe("success");
  });
});
