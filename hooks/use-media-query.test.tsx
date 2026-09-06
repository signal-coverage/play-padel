// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useMediaQuery } from "./use-media-query";

// No renderHook usage exists elsewhere in this repo's test suite, so this
// mirrors the established convention (see TabColumnsLayout.test.tsx) of
// exercising a hook through a tiny host component instead of
// @testing-library/react's renderHook.
function MatchesProbe({ query }: { query: string }) {
  const matches = useMediaQuery(query);
  return <span>{matches ? "matches" : "no-match"}</span>;
}

// jsdom doesn't implement matchMedia's real matching logic — this mirrors
// the same convention TabColumnsLayout.test.tsx uses for
// useShouldStackTabColumns: the stub only exists to satisfy the subscribe
// side's real-browser change-event wiring, while getSnapshot reads
// window.innerWidth directly (stubbed per-test below).
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

describe("useMediaQuery", () => {
  it("returns true when innerWidth is at or below the query's max-width boundary", () => {
    vi.stubGlobal("innerWidth", 767);

    render(<MatchesProbe query="(max-width: 767px)" />);

    expect(screen.getByText("matches")).toBeInTheDocument();
  });

  it("returns false when innerWidth is above the query's max-width boundary", () => {
    vi.stubGlobal("innerWidth", 768);

    render(<MatchesProbe query="(max-width: 767px)" />);

    expect(screen.getByText("no-match")).toBeInTheDocument();
  });

  it("subscribes to matchMedia change events for the exact given query", () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const matchMediaMock = vi.fn().mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    });
    vi.stubGlobal("matchMedia", matchMediaMock);
    vi.stubGlobal("innerWidth", 500);

    const { unmount } = render(<MatchesProbe query="(max-width: 767px)" />);

    expect(matchMediaMock).toHaveBeenCalledWith("(max-width: 767px)");
    expect(addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("re-evaluates independently for a different breakpoint query", () => {
    vi.stubGlobal("innerWidth", 800);

    render(<MatchesProbe query="(max-width: 808px)" />);

    expect(screen.getByText("matches")).toBeInTheDocument();
  });
});
