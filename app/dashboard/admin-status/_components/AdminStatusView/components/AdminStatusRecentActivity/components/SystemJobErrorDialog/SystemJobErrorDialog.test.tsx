// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SystemJobErrorDialog } from "./SystemJobErrorDialog";

const LONG_ERROR = "boom: ".repeat(200);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SystemJobErrorDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <SystemJobErrorDialog
        open={false}
        onOpenChange={vi.fn()}
        jobLabel="Clerk webhook"
        when="Sep 10, 12:00:00"
        errorMessage="Something failed"
      />,
    );

    expect(screen.queryByText("Error details")).not.toBeInTheDocument();
  });

  it("shows the job label, timestamp, and the complete error message when open", () => {
    render(
      <SystemJobErrorDialog
        open
        onOpenChange={vi.fn()}
        jobLabel="Clerk webhook"
        when="Sep 10, 12:00:00"
        errorMessage={LONG_ERROR}
      />,
    );

    expect(screen.getByText("Error details")).toBeInTheDocument();
    expect(
      screen.getByText("Clerk webhook · Sep 10, 12:00:00"),
    ).toBeInTheDocument();
    // The full, untruncated text — this is the whole point of the modal.
    // Checked via textContent (not getByText) since RTL's default text
    // matcher/normalizer isn't a good fit for a huge repeated string.
    expect(screen.getByTestId("system-job-error-text").textContent).toBe(
      LONG_ERROR,
    );
  });

  it("copies the full error message to the clipboard when Copy is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <SystemJobErrorDialog
        open
        onOpenChange={vi.fn()}
        jobLabel="Clerk webhook"
        when="Sep 10, 12:00:00"
        errorMessage="Signature verification failed"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith("Signature verification failed");
    expect(
      await screen.findByRole("button", { name: /copied/i }),
    ).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Close is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <SystemJobErrorDialog
        open
        onOpenChange={onOpenChange}
        jobLabel="Clerk webhook"
        when="Sep 10, 12:00:00"
        errorMessage="Signature verification failed"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("never throws when the clipboard is unavailable/blocked", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("nope")) },
    });

    render(
      <SystemJobErrorDialog
        open
        onOpenChange={vi.fn()}
        jobLabel="Clerk webhook"
        when="Sep 10, 12:00:00"
        errorMessage="Signature verification failed"
      />,
    );

    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    }).not.toThrow();
  });
});
