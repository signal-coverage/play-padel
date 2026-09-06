// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AdminClubList } from "./AdminClubList";
import type { AdminClubListItem } from "../../types";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const CLUB_A: AdminClubListItem = {
  id: "club_1",
  name: "Club Padel Norte",
  status: "ACTIVE",
  plan: "PRO",
  mpTokenIssue: false,
  membershipPastDue: false,
  noOperatingHours: false,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdminClubList export", () => {
  it("renders an Export CSV link pointing at the clubs export route", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    render(
      <AdminClubList
        clubs={[CLUB_A]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    const exportLink = screen.getByRole("link", { name: /export csv/i });
    expect(exportLink).toHaveAttribute("href", "/api/admin/export/clubs");
  });
});

describe("AdminClubList health indicator", () => {
  it("renders no warning icon for a club with no health issues", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    render(
      <AdminClubList
        clubs={[CLUB_A]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(
      screen.queryByTitle(/mercado pago|membership|operating hours/i),
    ).not.toBeInTheDocument();
  });

  it("renders a warning icon with a single-issue message for a club with one health issue", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    const club: AdminClubListItem = {
      ...CLUB_A,
      id: "club_2",
      membershipPastDue: true,
    };
    render(
      <AdminClubList
        clubs={[club]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(screen.getByTitle("Membership past due")).toBeInTheDocument();
  });

  it("renders a warning icon with a comma-joined message when multiple health issues apply", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    const club: AdminClubListItem = {
      ...CLUB_A,
      id: "club_3",
      mpTokenIssue: true,
      membershipPastDue: true,
      noOperatingHours: true,
    };
    render(
      <AdminClubList
        clubs={[club]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(
      screen.getByTitle(
        "Mercado Pago token expired, Membership past due, No operating hours configured",
      ),
    ).toBeInTheDocument();
  });
});

describe("AdminClubList health summary", () => {
  it("renders no summary line when no club needs attention", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    render(
      <AdminClubList
        clubs={[CLUB_A]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(screen.queryByText(/needs? attention/i)).not.toBeInTheDocument();
  });

  it("renders a count of clubs needing attention when one or more health flags apply", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    const healthyClub = CLUB_A;
    const flaggedClubB: AdminClubListItem = {
      ...CLUB_A,
      id: "club_2",
      membershipPastDue: true,
    };
    const flaggedClubC: AdminClubListItem = {
      ...CLUB_A,
      id: "club_3",
      noOperatingHours: true,
    };
    render(
      <AdminClubList
        clubs={[healthyClub, flaggedClubB, flaggedClubC]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(screen.getByText("2 clubs need attention")).toBeInTheDocument();
  });
});
