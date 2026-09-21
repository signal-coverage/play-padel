// @vitest-environment jsdom
import type * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { AdminClubList } from "./AdminClubList";
import type { AdminClubListItem } from "../../types";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const CLUB_A: AdminClubListItem = {
  id: "club_1",
  name: "Club Padel Norte",
  slug: "club-padel-norte",
  status: "ACTIVE",
  plan: "PRO",
  courtLimit: null,
  mpTokenIssue: false,
  membershipPastDue: false,
  noOperatingHours: false,
  isFreePlan: false,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdminClubList health indicator", () => {
  it("renders no warning icon for a club with no health issues", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    renderWithIntl(
      <AdminClubList
        clubs={[CLUB_A]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(
      screen.queryByTitle(/mercado pago|membresía|horarios de atención/i),
    ).not.toBeInTheDocument();
  });

  it("renders a warning icon with a single-issue message for a club with one health issue", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    const club: AdminClubListItem = {
      ...CLUB_A,
      id: "club_2",
      membershipPastDue: true,
    };
    renderWithIntl(
      <AdminClubList
        clubs={[club]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(screen.getByTitle("Membresía vencida")).toBeInTheDocument();
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
    renderWithIntl(
      <AdminClubList
        clubs={[club]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(
      screen.getByTitle(
        "El token de Mercado Pago expiró, Membresía vencida, Sin horarios de atención configurados",
      ),
    ).toBeInTheDocument();
  });
});

describe("AdminClubList health summary", () => {
  it("renders no summary line when no club needs attention", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    renderWithIntl(
      <AdminClubList
        clubs={[CLUB_A]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(screen.queryByText(/necesitan? atención/i)).not.toBeInTheDocument();
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
    renderWithIntl(
      <AdminClubList
        clubs={[healthyClub, flaggedClubB, flaggedClubC]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(screen.getByText("2 clubes necesitan atención")).toBeInTheDocument();
  });
});

describe("AdminClubList free-plan badge", () => {
  it("does not render a Free badge for a club whose membership subscription isn't FREE", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    renderWithIntl(
      <AdminClubList
        clubs={[CLUB_A]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(screen.queryByText("Gratis")).not.toBeInTheDocument();
  });

  // plan is deliberately left as "BASIC" (not "FREE") here: isFreePlan
  // reflects the membership subscription's plan, which activateFreePlan
  // sets independently of Club.plan (the court-capacity tier, which never
  // changes when a club is comped to free) — this proves the badge no
  // longer depends on `plan` at all.
  it("renders a Free badge alongside the status and plan badges when isFreePlan is true, regardless of the club.plan value", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    const freeClub: AdminClubListItem = {
      ...CLUB_A,
      plan: "BASIC",
      isFreePlan: true,
    };
    renderWithIntl(
      <AdminClubList
        clubs={[freeClub]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("BASIC")).toBeInTheDocument();
    expect(screen.getByText("Gratis")).toBeInTheDocument();
  });
});

describe("AdminClubList mobile height", () => {
  it("gives the table extra minimum height on mobile with a trailing spacer, while leaving desktop sizing untouched", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    renderWithIntl(
      <AdminClubList
        clubs={[CLUB_A]}
        isLoading={false}
        onSelectClub={() => {}}
      />,
    );

    // Same fix as PlayersDirectory's table (see its own comments for the
    // full explanation).
    const table = screen.getByRole("table");
    const wrapper = table.closest(".rounded-sm.border");
    expect(wrapper?.className).toContain("min-h-[60svh]");
    expect(wrapper?.className).toMatch(/\bmd:min-h-0\b/);

    const spacer = wrapper?.nextElementSibling as HTMLElement | null;
    expect(spacer).not.toBeNull();
    expect(spacer?.getAttribute("aria-hidden")).toBe("true");
    expect(spacer?.className).toMatch(/\bh-8\b/);
    expect(spacer?.className).toMatch(/\bmd:hidden\b/);
  });
});
