// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { act, render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useInView } from "./use-in-view";

// No renderHook usage exists elsewhere in this repo's test suite (see
// use-media-query.test.tsx) — this exercises the hook through a tiny host
// component instead of @testing-library/react's renderHook, matching that
// established convention.
function InViewProbe({ triggerOnce }: { triggerOnce?: boolean }) {
  const { ref, isInView } = useInView<HTMLDivElement>({ triggerOnce });
  return <div ref={ref}>{isInView ? "in-view" : "out-of-view"}</div>;
}

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

let observeMock: ReturnType<typeof vi.fn>;
let disconnectMock: ReturnType<typeof vi.fn>;
let unobserveMock: ReturnType<typeof vi.fn>;
let capturedCallback: ObserverCallback | null;

beforeEach(() => {
  observeMock = vi.fn();
  disconnectMock = vi.fn();
  unobserveMock = vi.fn();
  capturedCallback = null;

  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: ObserverCallback) {
        capturedCallback = callback;
      }
      observe = observeMock;
      unobserve = unobserveMock;
      disconnect = disconnectMock;
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useInView", () => {
  it("starts out of view before any intersection is reported", () => {
    render(<InViewProbe />);

    expect(screen.getByText("out-of-view")).toBeInTheDocument();
    expect(observeMock).toHaveBeenCalledTimes(1);
  });

  it("reports in-view once IntersectionObserver reports an intersecting entry", () => {
    render(<InViewProbe />);

    act(() => {
      capturedCallback?.([{ isIntersecting: true }]);
    });

    expect(screen.getByText("in-view")).toBeInTheDocument();
  });

  it("disconnects the observer once triggered (triggerOnce defaults to true)", () => {
    render(<InViewProbe />);

    act(() => {
      capturedCallback?.([{ isIntersecting: true }]);
    });

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it("stays in-view even after the element later leaves the viewport (triggerOnce default)", () => {
    render(<InViewProbe />);

    act(() => {
      capturedCallback?.([{ isIntersecting: true }]);
    });
    act(() => {
      capturedCallback?.([{ isIntersecting: false }]);
    });

    expect(screen.getByText("in-view")).toBeInTheDocument();
  });

  it("toggles back out of view on exit when triggerOnce is false", () => {
    render(<InViewProbe triggerOnce={false} />);

    act(() => {
      capturedCallback?.([{ isIntersecting: true }]);
    });
    expect(screen.getByText("in-view")).toBeInTheDocument();

    act(() => {
      capturedCallback?.([{ isIntersecting: false }]);
    });
    expect(screen.getByText("out-of-view")).toBeInTheDocument();
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(<InViewProbe />);

    unmount();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
