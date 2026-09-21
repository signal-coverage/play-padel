// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { act, render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FadeInSection } from "./FadeInSection";

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

let capturedCallback: ObserverCallback | null;

beforeEach(() => {
  capturedCallback = null;

  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: ObserverCallback) {
        capturedCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FadeInSection", () => {
  it("renders children", () => {
    render(
      <FadeInSection>
        <span>hello</span>
      </FadeInSection>,
    );

    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders a div by default", () => {
    render(
      <FadeInSection>
        <span>content</span>
      </FadeInSection>,
    );

    expect(screen.getByText("content").parentElement?.tagName).toBe("DIV");
  });

  it("renders the given `as` element instead of a div", () => {
    render(
      <FadeInSection as="p">
        <span>content</span>
      </FadeInSection>,
    );

    expect(screen.getByText("content").parentElement?.tagName).toBe("P");
  });

  it("starts hidden before the element intersects the viewport", () => {
    render(
      <FadeInSection>
        <span>content</span>
      </FadeInSection>,
    );

    expect(screen.getByText("content").parentElement).toHaveClass("opacity-0");
  });

  it("becomes visible once IntersectionObserver reports the element is intersecting", () => {
    render(
      <FadeInSection>
        <span>content</span>
      </FadeInSection>,
    );

    act(() => {
      capturedCallback?.([{ isIntersecting: true }]);
    });

    expect(screen.getByText("content").parentElement).toHaveClass(
      "opacity-100",
    );
  });

  it("forwards a custom className alongside the transition classes", () => {
    render(
      <FadeInSection className="mt-4">
        <span>content</span>
      </FadeInSection>,
    );

    expect(screen.getByText("content").parentElement).toHaveClass("mt-4");
  });
});
