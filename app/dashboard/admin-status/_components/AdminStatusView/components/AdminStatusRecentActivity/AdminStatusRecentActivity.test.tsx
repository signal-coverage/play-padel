// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AdminStatusRecentActivity } from "./AdminStatusRecentActivity";
import type { SystemJobLogRecord } from "../../types";

function entry(
  overrides: Partial<SystemJobLogRecord> = {},
): SystemJobLogRecord {
  return {
    id: "job_1",
    kind: "WEBHOOK",
    name: "clerk",
    status: "FAILURE",
    startedAt: new Date("2026-09-10T12:00:00Z"),
    finishedAt: new Date("2026-09-10T12:00:01Z"),
    errorMessage: "Signature verification failed",
    createdAt: new Date("2026-09-10T12:00:00Z"),
    ...overrides,
  };
}

// jsdom doesn't implement ResizeObserver, but DataTable relies on it
// internally — same stub ClubSettingsView.test.tsx/CourtsView.test.tsx
// already use.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdminStatusRecentActivity", () => {
  it("renders a failed entry's error as a clickable trigger, not just plain truncated text", () => {
    render(<AdminStatusRecentActivity entries={[entry()]} isLoading={false} />);

    expect(
      screen.getByRole("button", { name: "Signature verification failed" }),
    ).toBeInTheDocument();
  });

  it("renders a plain dash for a successful entry, with nothing to click into", () => {
    render(
      <AdminStatusRecentActivity
        entries={[entry({ status: "SUCCESS", errorMessage: null })]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /verification/i }),
    ).not.toBeInTheDocument();
  });

  it("opens a modal with the complete error message when the error is clicked", () => {
    render(<AdminStatusRecentActivity entries={[entry()]} isLoading={false} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Signature verification failed" }),
    );

    expect(screen.getByText("Error details")).toBeInTheDocument();
    // The dialog's own subtitle — distinct from the table's separate "Job"
    // column cell, which also just says "Clerk webhook" on its own.
    expect(screen.getByText(/Clerk webhook ·/)).toBeInTheDocument();
  });

  it("closes the modal again when Close is clicked", () => {
    render(<AdminStatusRecentActivity entries={[entry()]} isLoading={false} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Signature verification failed" }),
    );
    expect(screen.getByText("Error details")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Error details")).not.toBeInTheDocument();
  });
});
