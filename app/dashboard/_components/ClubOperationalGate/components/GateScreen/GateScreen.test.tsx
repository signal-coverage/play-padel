// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GateScreen } from "./GateScreen";

afterEach(() => {
  // This repo's vitest.config.mts does not enable `test.globals`, so
  // @testing-library/react's automatic afterEach(cleanup) registration
  // never fires — clean up the DOM explicitly between tests instead.
  cleanup();
});

describe("GateScreen", () => {
  it("renders the title and description", () => {
    render(
      <GateScreen
        title="Some gate"
        description="Some explanation."
        submitLabel="Continue"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Some gate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Some explanation.")).toBeInTheDocument();
  });

  it("renders children plus both separators when children are provided", () => {
    render(
      <GateScreen
        title="Some gate"
        description="Some explanation."
        submitLabel="Continue"
      >
        <div>Body content</div>
      </GateScreen>,
    );

    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="separator"]')).toHaveLength(
      2,
    );
  });

  it("renders just one separator and the footer when children are omitted", () => {
    render(
      <GateScreen
        title="Some gate"
        description="Some explanation."
        submitLabel="Continue"
      />,
    );

    expect(document.querySelectorAll('[data-slot="separator"]')).toHaveLength(
      1,
    );
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
  });

  it("calls onSubmit when the submit button is clicked", () => {
    const onSubmit = vi.fn();
    render(
      <GateScreen
        title="Some gate"
        description="Some explanation."
        submitLabel="Continue"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables the submit button when submitDisabled is true", () => {
    render(
      <GateScreen
        title="Some gate"
        description="Some explanation."
        submitLabel="Continue"
        submitDisabled
      />,
    );

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("renders without a submit button when submitLabel is omitted", () => {
    render(
      <GateScreen title="Some gate" description="Some explanation.">
        <div>Body content</div>
      </GateScreen>,
    );

    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("still renders the submit button when submitLabel is provided (regression: ClubInactiveCard)", () => {
    render(
      <GateScreen
        title="Some gate"
        description="Some explanation."
        submitLabel="Renew membership"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Renew membership" }),
    ).toBeInTheDocument();
  });
});
