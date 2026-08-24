// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ClubInactiveCard } from "./ClubInactiveCard";

afterEach(() => {
  // This repo's vitest.config.mts does not enable `test.globals`, so
  // @testing-library/react's automatic afterEach(cleanup) registration
  // never fires — clean up the DOM explicitly between tests instead.
  cleanup();
});

describe("ClubInactiveCard", () => {
  it("renders the disabled CTA with no onSubmit wired, without crashing", () => {
    render(<ClubInactiveCard />);

    expect(
      screen.getByRole("heading", { name: "Renew your membership" }),
    ).toBeInTheDocument();

    const cta = screen.getByRole("button", { name: "Renew membership" });
    expect(cta).toBeDisabled();
  });
});
