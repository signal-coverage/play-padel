// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MobileBottomNav } from "./MobileBottomNav";
import type { SystemRole } from "@/providers/auth-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

function renderMobileBottomNav(
  role: SystemRole,
  fetchMock: ReturnType<typeof vi.fn>,
  isAdmin = false,
) {
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MobileBottomNav role={role} isAdmin={isAdmin} />
    </QueryClientProvider>,
  );
}

// See NavLinks.test.tsx's identical helper for why this is needed at all —
// jsdom never lays out real pixels, so every test not specifically about
// overflow relies on the default (every measured width is 0, "everything
// fits"); the "dynamic overflow" describe block below stubs real values to
// exercise useOverflowNav's actual wiring instead of its pure-arithmetic
// unit tests (computeVisibleCount, in utils.test.ts).
const originalOffsetWidthDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "offsetWidth",
);

function stubOffsetWidths(config: {
  containerWidth: number;
  itemWidths: Record<string, number>;
  triggerWidth: number;
}) {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get(this: HTMLElement) {
      if (this.dataset.testid === "nav-overflow-container") {
        return config.containerWidth;
      }
      if (this.tagName === "A") {
        const href = this.getAttribute("href");
        return href ? (config.itemWidths[href] ?? 0) : 0;
      }
      if (this.classList.contains("inline-flex")) {
        return config.triggerWidth;
      }
      return 0;
    },
  });
}

function restoreOffsetWidth() {
  if (originalOffsetWidthDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      "offsetWidth",
      originalOffsetWidthDescriptor,
    );
  }
}

describe("MobileBottomNav", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    restoreOffsetWidth();
  });

  it("shows only Dashboard when the owner's club is confirmed non-operational", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: false }),
    });
    renderMobileBottomNav("owner", fetchMock);

    await waitFor(() =>
      expect(screen.queryByText("Courts")).not.toBeInTheDocument(),
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Reservations")).not.toBeInTheDocument();
    expect(screen.queryByText("Club Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("never fetches operational status for a player, and shows the full player nav", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tournaments: [] }),
    });
    renderMobileBottomNav("player", fetchMock);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Browse Courts")).toBeInTheDocument();

    // A player does fetch open-tournaments status (for the Tournaments nav
    // item's visibility/badge) — only the owner-only operational-status
    // fetch must never fire for a player.
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/tournaments/open"),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/clubs/mercadopago/operational-status",
    );
  });

  it("shows the Tournaments nav item with a dot badge for a player when a tournament is open", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tournaments: [
          {
            id: "t1",
            name: "Winter Cup",
            clubName: "Club A",
            publishedAt: new Date(Date.now() - 1000).toISOString(),
          },
        ],
      }),
    });
    renderMobileBottomNav("player", fetchMock);

    expect(await screen.findByText("Tournaments")).toBeInTheDocument();
    // Mobile uses the compact dot variant (no room for a text pill next to
    // the icon+label column) — its label is accessible via sr-only text,
    // not a visible "New"/"Open" pill like the desktop NavLinks badge.
    expect(
      screen.getByText("New", { selector: ".sr-only" }),
    ).toBeInTheDocument();
  });

  it("hides Audit Log for a non-admin owner", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: true }),
    });
    renderMobileBottomNav("owner", fetchMock, false);

    await waitFor(() =>
      expect(screen.getByText("Dashboard")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("shows Audit Log for an admin owner", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: true }),
    });
    renderMobileBottomNav("owner", fetchMock, true);

    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Admin"));

    expect(
      await screen.findByRole("menuitem", { name: "Audit Log" }),
    ).toBeInTheDocument();
  });

  // Same reasoning as NavLinks.test.tsx's "admin-widened Club Settings"
  // block — a player-role admin has no Courts/Reservations to cluster Club
  // Settings with, so it joins the same Admin dropdown as Audit Log/etc.
  // here too, instead of sitting as its own bottom-nav tab and crowding the
  // already-tight mobile row.
  it("folds Club Settings into the Admin dropdown for a player-role admin, not its own tab", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tournaments: [] }),
    });
    renderMobileBottomNav("player", fetchMock, true);

    await screen.findByText("Admin");
    expect(
      screen.queryByRole("link", { name: /club settings/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Admin"));

    expect(
      await screen.findByRole("menuitem", { name: "Club Settings" }),
    ).toHaveAttribute("href", "/dashboard/settings/club");
  });

  it("gives every tab button (including the Admin trigger) the same fixed width", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: true }),
    });
    renderMobileBottomNav("owner", fetchMock, true);

    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());

    const links = screen.getAllByRole("link");
    const adminTrigger = screen.getByRole("button", { name: "Admin" });
    const buttons = [...links, adminTrigger];

    expect(buttons.length).toBeGreaterThan(1);
    buttons.forEach((button) => {
      expect(button.className).toMatch(/\bw-16\b/);
      expect(button.className).not.toMatch(/\bmin-w-0\b/);
    });
  });

  it("puts Dashboard, the visible tabs, and the Admin trigger inside the same flex row, evenly spaced by one justify-around instead of nested blocks", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: true }),
    });
    renderMobileBottomNav("owner", fetchMock, true);

    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());

    const container = screen.getByTestId("nav-overflow-container");
    // No overflow-hidden: an open Admin/More dropdown is position: absolute
    // and needs to escape this box to be visible at all (see the "the
    // dropdown doesn't do anything" bugfix elsewhere in this file) — this
    // must never regress now that Admin lives inside this same container.
    expect(container.className).not.toMatch(/\boverflow-hidden\b/);

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    const adminButton = screen.getByRole("button", { name: "Admin" });
    expect(container.contains(dashboardLink)).toBe(true);
    expect(container.contains(adminButton)).toBe(true);
  });

  describe("dynamic overflow (real measured widths)", () => {
    it("moves the trailing items that don't fit into a More dropdown, keeping the leading ones flat", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ operational: true }),
      });
      // Only "Courts" (40px) + the trigger (30px) fit in 80px; Reservations
      // and Club Settings overflow into "More".
      stubOffsetWidths({
        containerWidth: 80,
        itemWidths: {
          "/dashboard/courts": 40,
          "/dashboard/reservations": 50,
          "/dashboard/settings/club": 50,
        },
        triggerWidth: 30,
      });
      renderMobileBottomNav("owner", fetchMock, false);

      await waitFor(() =>
        expect(screen.getByText("Courts")).toBeInTheDocument(),
      );
      // Role-based, not getByText: the hidden measurement clone (see
      // MobileBottomNav.tsx's own comment) always renders the currently-
      // overflowed items' text too, for measurement — aria-hidden correctly
      // excludes it from the accessibility tree, unlike a plain text query.
      expect(
        screen.queryByRole("link", { name: /reservations/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /club settings/i }),
      ).not.toBeInTheDocument();

      const moreButton = await screen.findByRole("button", { name: "More" });
      // The visible trigger must NOT be a descendant of the overflow-hidden
      // measuring container — jsdom doesn't compute real CSS clipping, so
      // this regression (the dropdown opening but staying invisible, since
      // its open menu is position: absolute inside an overflow-hidden
      // ancestor) is invisible to every other assertion here.
      expect(
        screen.getByTestId("nav-overflow-container").contains(moreButton),
      ).toBe(false);

      fireEvent.click(moreButton);

      expect(
        await screen.findByRole("menuitem", { name: "Reservations" }),
      ).toHaveAttribute("href", "/dashboard/reservations");
      expect(
        screen.getByRole("menuitem", { name: "Club Settings" }),
      ).toHaveAttribute("href", "/dashboard/settings/club");
    });

    it("reserves the Admin trigger's own real width from the budget, not just placing it inside the row", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ operational: true }),
      });
      // Identical widths to the "moves the trailing items..." test above,
      // where Courts (80px — using that test's numbers, not this
      // describe's other 40px ones) comfortably fit a 150px container with
      // no Admin trigger. With isAdmin: true this time, the Admin trigger's
      // own real width (also read as `triggerWidth` — it shares the
      // "inline-flex" wrapper class the stub keys that off, same as the
      // More trigger clone) must be subtracted from that same 150px budget
      // too, or the arithmetic would wrongly think Courts still fits in
      // space Admin is actually occupying.
      stubOffsetWidths({
        containerWidth: 150,
        itemWidths: {
          "/dashboard/courts": 80,
          "/dashboard/reservations": 100,
          "/dashboard/settings/club": 100,
        },
        triggerWidth: 60,
      });
      renderMobileBottomNav("owner", fetchMock, true);

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Admin" }),
        ).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("link", { name: "Courts" }),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "More" }));
      expect(
        await screen.findByRole("menuitem", { name: "Courts" }),
      ).toHaveAttribute("href", "/dashboard/courts");
    });

    it("never overflows the essential Dashboard item, even when nothing else fits", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ operational: true }),
      });
      stubOffsetWidths({
        containerWidth: 5,
        itemWidths: {
          "/dashboard/courts": 40,
          "/dashboard/reservations": 50,
          "/dashboard/settings/club": 50,
        },
        triggerWidth: 30,
      });
      renderMobileBottomNav("owner", fetchMock, false);

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "More" }),
        ).toBeInTheDocument(),
      );
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
