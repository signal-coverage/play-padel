// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CourtLimitReachedDialog } from "./CourtLimitReachedDialog";

afterEach(() => {
  cleanup();
});

describe("CourtLimitReachedDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <CourtLimitReachedDialog
        open={false}
        onOpenChange={() => {}}
        plan="BASIC"
        limit={2}
      />,
    );

    expect(screen.queryByText(/court limit reached/i)).not.toBeInTheDocument();
  });

  it("explains the plan's court limit when open", () => {
    render(
      <CourtLimitReachedDialog
        open={true}
        onOpenChange={() => {}}
        plan="BASIC"
        limit={2}
      />,
    );

    expect(screen.getByText(/court limit reached/i)).toBeInTheDocument();
    expect(
      screen.getByText(/BASIC plan allows up to 2 courts/i),
    ).toBeInTheDocument();
  });

  it("singularizes the copy for a limit of exactly 1", () => {
    render(
      <CourtLimitReachedDialog
        open={true}
        onOpenChange={() => {}}
        plan="MAX"
        limit={1}
      />,
    );

    expect(
      screen.getByText(/MAX plan allows up to 1 court\b/i),
    ).toBeInTheDocument();
  });

  it("links the primary action to the dashboard, where the real Upgrade button lives", () => {
    render(
      <CourtLimitReachedDialog
        open={true}
        onOpenChange={() => {}}
        plan="BASIC"
        limit={2}
      />,
    );

    const link = screen.getByRole("link", { name: /go to dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("calls onOpenChange(false) when the Close button is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <CourtLimitReachedDialog
        open={true}
        onOpenChange={onOpenChange}
        plan="BASIC"
        limit={2}
      />,
    );

    screen.getByRole("button", { name: /close/i }).click();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
