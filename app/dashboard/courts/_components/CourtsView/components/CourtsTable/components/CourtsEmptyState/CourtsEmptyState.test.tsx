// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CourtsEmptyState } from "./CourtsEmptyState";

afterEach(() => {
  // This repo's vitest.config.mts does not enable `test.globals`, so
  // @testing-library/react's automatic afterEach(cleanup) registration
  // never fires — clean up the DOM explicitly between tests instead.
  cleanup();
});

describe("CourtsEmptyState", () => {
  it("renders an image above the exact empty-state message", () => {
    render(<CourtsEmptyState />);

    const message = screen.getByText(
      "No courts yet. Create your first court to get started.",
    );
    expect(message).toBeInTheDocument();

    const image = document.querySelector("img");
    expect(image).not.toBeNull();
  });
});
