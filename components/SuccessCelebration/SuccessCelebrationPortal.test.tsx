// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const { useReducedMotionMock } = vi.hoisted(() => ({
  useReducedMotionMock: vi.fn(() => false as boolean | null),
}));
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: useReducedMotionMock };
});

import { fireSuccessCelebration } from "@/lib/utils/celebration";
import { SuccessCelebrationPortal } from "./SuccessCelebrationPortal";
import { CELEBRATION_DURATION_MS } from "./consts";

afterEach(() => {
  cleanup();
  useReducedMotionMock.mockReturnValue(false);
  vi.useRealTimers();
});

describe("SuccessCelebrationPortal", () => {
  it("renders nothing until a celebration fires", () => {
    const { container } = render(<SuccessCelebrationPortal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the ball overlay once fireSuccessCelebration is called", () => {
    const { container } = render(<SuccessCelebrationPortal />);

    act(() => {
      fireSuccessCelebration();
    });

    expect(container.querySelectorAll("svg")).not.toHaveLength(0);
  });

  it("removes the overlay again once the celebration finishes", () => {
    vi.useFakeTimers();
    const { container } = render(<SuccessCelebrationPortal />);

    act(() => {
      fireSuccessCelebration();
    });
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(CELEBRATION_DURATION_MS);
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("never renders balls when the user prefers reduced motion", () => {
    useReducedMotionMock.mockReturnValue(true);
    const { container } = render(<SuccessCelebrationPortal />);

    act(() => {
      fireSuccessCelebration();
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("stops listening once unmounted (no leaked subscription)", () => {
    const { unmount } = render(<SuccessCelebrationPortal />);
    unmount();

    // Would throw if a listener from the unmounted instance were still
    // attached and tried to update state on an unmounted component.
    expect(() => {
      act(() => {
        fireSuccessCelebration();
      });
    }).not.toThrow();
  });
});
