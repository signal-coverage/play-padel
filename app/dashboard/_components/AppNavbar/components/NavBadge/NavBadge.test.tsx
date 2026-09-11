// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NavBadge } from "./NavBadge";

describe("NavBadge", () => {
  afterEach(() => {
    cleanup();
  });

  it('renders visible "New" text for label "new" in the default (pill) variant', () => {
    render(<NavBadge label="new" />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it('renders visible "Open" text for label "open" in the default (pill) variant', () => {
    render(<NavBadge label="open" />);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders no visible pill text in the dot variant", () => {
    render(<NavBadge label="open" variant="dot" />);
    expect(
      screen.queryByText("Open", { selector: ":not(.sr-only)" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the label accessible via sr-only text in the dot variant", () => {
    render(<NavBadge label="new" variant="dot" />);
    expect(
      screen.getByText("New", { selector: ".sr-only" }),
    ).toBeInTheDocument();
  });
});
