// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PendingApprovalCard } from "./PendingApprovalCard";

describe("PendingApprovalCard", () => {
  afterEach(() => {
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // never fires — clean up the DOM explicitly between tests instead.
    cleanup();
  });

  it("renders an informational heading and description, with no action button", () => {
    render(<PendingApprovalCard />);

    expect(
      screen.getByRole("heading", { name: "Your club is under review" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we'll notify you once it's approved/i),
    ).toBeInTheDocument();

    // Informational only — an owner can't self-approve, so there is no
    // submit/CTA button at all (unlike ClubInactiveCard's "Renew membership"
    // or PaymentActivationScreen's payout-method actions).
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
