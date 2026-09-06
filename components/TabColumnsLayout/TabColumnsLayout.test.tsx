// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TabColumnsLayout } from "./TabColumnsLayout";

// jsdom doesn't implement matchMedia — useShouldStackTabColumns' getSnapshot
// reads window.innerWidth directly (stubbed per-test below), this stub only
// exists to satisfy the subscribe side's real-browser change-event wiring.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TabColumnsLayout", () => {
  it("renders a single child in one flex-col column by default", () => {
    const { container } = render(
      <TabColumnsLayout>
        <div>Only child</div>
      </TabColumnsLayout>,
    );

    expect(screen.getByText("Only child")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="separator"]')).toBeNull();

    const outer = container.firstElementChild;
    expect(outer).toHaveClass("flex", "flex-col", "gap-4");
  });

  it('renders a single child in one flex-col column for columns="one"', () => {
    const { container } = render(
      <TabColumnsLayout columns="one">
        <div>Only child</div>
      </TabColumnsLayout>,
    );

    expect(screen.getByText("Only child")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="separator"]')).toBeNull();
  });

  it('renders two children in separate columns with a visible Separator between them for columns="two"', () => {
    const { container } = render(
      <TabColumnsLayout columns="two">
        <div>Left content</div>
        <div>Right content</div>
      </TabColumnsLayout>,
    );

    expect(screen.getByText("Left content")).toBeInTheDocument();
    expect(screen.getByText("Right content")).toBeInTheDocument();

    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("data-orientation", "vertical");

    // Left content's column comes before the separator, which comes before
    // the right content's column — proving it's a genuine two-column split,
    // not just two divs rendered in any order.
    const left = screen.getByText("Left content");
    const right = screen.getByText("Right content");
    expect(
      left.compareDocumentPosition(separator as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (separator as Node).compareDocumentPosition(right) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  describe("stacked layout at 808px or narrower", () => {
    it("stacks the two columns (first on top, second below) with a horizontal Separator instead of a vertical one", () => {
      vi.stubGlobal("innerWidth", 700);

      const { container } = render(
        <TabColumnsLayout columns="two">
          <div>Basic information</div>
          <div>Legal information</div>
        </TabColumnsLayout>,
      );

      const separator = container.querySelector('[data-slot="separator"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute("data-orientation", "horizontal");

      const first = screen.getByText("Basic information");
      const second = screen.getByText("Legal information");
      expect(
        first.compareDocumentPosition(separator as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        (separator as Node).compareDocumentPosition(second) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("does not stack at 809px (one px above the cutoff) — stays two columns with a vertical Separator", () => {
      vi.stubGlobal("innerWidth", 809);

      const { container } = render(
        <TabColumnsLayout columns="two">
          <div>Left content</div>
          <div>Right content</div>
        </TabColumnsLayout>,
      );

      const separator = container.querySelector('[data-slot="separator"]');
      expect(separator).toHaveAttribute("data-orientation", "vertical");
    });
  });
});
