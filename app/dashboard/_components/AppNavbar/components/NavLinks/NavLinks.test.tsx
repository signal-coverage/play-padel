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
import { NavLinks } from "./NavLinks";
import type { SystemRole } from "@/providers/auth-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

function renderNavLinks(
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
      <NavLinks role={role} isAdmin={isAdmin} />
    </QueryClientProvider>,
  );
}

// jsdom never lays out real pixels, so every element's real `offsetWidth` is
// 0 by default — useOverflowNav's own computeVisibleCount then always finds
// "everything fits" (0 <= 0) and shows every item flat, which is what every
// test below not specifically about overflow relies on. The dedicated
// "dynamic overflow" describe block further down stubs `offsetWidth` on the
// prototype (keyed by stable attributes: the overflow container's
// data-testid, each item link's href, and the More/Admin trigger's known
// shape) to exercise the real measured-width wiring instead of the pure
// computeVisibleCount tests in utils.test.ts.
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

describe("NavLinks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // never fires — clean up the DOM explicitly between tests instead.
    cleanup();
    vi.unstubAllGlobals();
    // Undo stubOffsetWidths, if this test used it — restores jsdom's own
    // descriptor exactly, so a later test (in this file or, if isolation is
    // ever disabled, another one) never sees the stubbed values.
    restoreOffsetWidth();
  });

  it("shows only Dashboard while the operational status is still loading", () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    renderNavLinks("owner", fetchMock);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    // Not yet confirmed operational — must not flash items that might
    // immediately need to disappear once the query resolves.
    expect(screen.queryByText("Courts")).not.toBeInTheDocument();
    expect(screen.queryByText("Reservations")).not.toBeInTheDocument();
    expect(screen.queryByText("Club Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("shows the full owner nav once the club is confirmed operational", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: true }),
    });
    renderNavLinks("owner", fetchMock);

    await waitFor(() => expect(screen.getByText("Courts")).toBeInTheDocument());

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Reservations")).toBeInTheDocument();
    expect(screen.getByText("Club Settings")).toBeInTheDocument();
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("hides Audit Log for a non-admin owner even when explicitly passed isAdmin={false}", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: true }),
    });
    renderNavLinks("owner", fetchMock, false);

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
    renderNavLinks("owner", fetchMock, true);

    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Admin"));

    expect(
      await screen.findByRole("menuitem", { name: "Audit Log" }),
    ).toBeInTheDocument();
  });

  it("shows Audit Log for an admin whose role is player", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tournaments: [] }),
    });
    renderNavLinks("player", fetchMock, true);

    fireEvent.click(await screen.findByText("Admin"));

    expect(
      await screen.findByRole("menuitem", { name: "Audit Log" }),
    ).toBeInTheDocument();
  });

  // A player-role admin only ever reaches Club Settings via visibleToAdmin
  // widening — it belongs in the same Admin dropdown as Audit Log/Search/
  // etc. instead of the dynamic overflow area, at every width (this routing
  // is unconditional, not measured — see partitionNavLinks's own
  // viaAdminWidening handling in ../../utils and its unit tests in
  // utils.test.ts).
  it("routes admin-widened Club Settings into the Admin dropdown, not a flat pill or the overflow area", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tournaments: [] }),
    });
    renderNavLinks("player", fetchMock, true);

    await screen.findByText("Admin");
    expect(
      screen.queryByRole("link", { name: "Club Settings" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Admin"));

    expect(
      await screen.findByRole("menuitem", { name: "Club Settings" }),
    ).toHaveAttribute("href", "/dashboard/settings/club");
  });

  it("shows only Dashboard when the owner's club is confirmed non-operational", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: false }),
    });
    renderNavLinks("owner", fetchMock);

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
    renderNavLinks("player", fetchMock);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Browse Courts")).toBeInTheDocument();
    expect(screen.getByText("My Reservations")).toBeInTheDocument();
    expect(screen.getByText("Players")).toBeInTheDocument();

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

  it("hides the Tournaments nav item for a player when no tournament is open", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tournaments: [] }),
    });
    renderNavLinks("player", fetchMock);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/tournaments/open"),
    );
    expect(screen.queryByText("Tournaments")).not.toBeInTheDocument();
  });

  it('shows the Tournaments nav item with an "Open" badge when a tournament is open and not recently published', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tournaments: [
          {
            id: "t1",
            name: "Winter Cup",
            clubName: "Club A",
            publishedAt: new Date(
              Date.now() - 72 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
      }),
    });
    renderNavLinks("player", fetchMock);

    expect(await screen.findByText("Tournaments")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it('shows the Tournaments nav item with a "New" badge when a tournament was published under 48h ago', async () => {
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
    renderNavLinks("player", fetchMock);

    expect(await screen.findByText("Tournaments")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  // Real measured-width wiring — not the pure arithmetic (see
  // computeVisibleCount's own thorough unit tests in utils.test.ts), but
  // that useOverflowNav actually reads the right elements' widths and drives
  // the right DOM output. jsdom never lays out real pixels, so widths are
  // stubbed via stubOffsetWidths (see its own comment above) rather than a
  // real browser measurement.
  describe("dynamic overflow (real measured widths)", () => {
    it("keeps every item flat when they all fit — no More trigger at all", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ operational: true }),
      });
      stubOffsetWidths({
        containerWidth: 1000,
        itemWidths: {
          "/dashboard/courts": 80,
          "/dashboard/reservations": 100,
          "/dashboard/settings/club": 100,
        },
        triggerWidth: 80,
      });
      renderNavLinks("owner", fetchMock, false);

      await waitFor(() =>
        expect(screen.getByText("Courts")).toBeInTheDocument(),
      );
      expect(screen.getByText("Reservations")).toBeInTheDocument();
      expect(screen.getByText("Club Settings")).toBeInTheDocument();
      // Role-based, not getByText: the hidden measurement clone (see
      // NavLinks.tsx's own comment) always renders a "More" trigger for
      // width purposes even when nothing has overflowed — aria-hidden
      // correctly excludes it from the accessibility tree, so a role query
      // is what actually asserts "the real, visible trigger isn't shown".
      expect(
        screen.queryByRole("button", { name: "More" }),
      ).not.toBeInTheDocument();
    });

    it("moves the trailing items that don't fit into a More dropdown, keeping the leading ones flat", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ operational: true }),
      });
      // Only "Courts" (80px) + the trigger (60px) fit in 150px; Reservations
      // and Club Settings overflow into "More".
      stubOffsetWidths({
        containerWidth: 150,
        itemWidths: {
          "/dashboard/courts": 80,
          "/dashboard/reservations": 100,
          "/dashboard/settings/club": 100,
        },
        triggerWidth: 60,
      });
      renderNavLinks("owner", fetchMock, false);

      await waitFor(() =>
        expect(screen.getByText("Courts")).toBeInTheDocument(),
      );
      // Role-based — see the previous test's comment: the hidden
      // measurement clone renders the overflowed items' text too (needed to
      // measure them), so a plain getByText would find that copy.
      expect(
        screen.queryByRole("link", { name: "Reservations" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Club Settings" }),
      ).not.toBeInTheDocument();

      const moreButton = await screen.findByRole("button", { name: "More" });
      // The visible trigger sits right after the fitted items, inside the
      // same measured container — not pushed out to the far right next to
      // Admin (that container is flex-1 and absorbs all of nav's leftover
      // width; a sibling placed AFTER it would render at ITS right edge,
      // flush against Admin, instead of immediately following Courts et
      // al. — see this file's "More" positioning comment). The container
      // must NOT have overflow-hidden either — jsdom doesn't compute real
      // CSS clipping, so a dropdown that opens but stays invisible (its
      // menu is position: absolute and needs to escape an overflow-hidden
      // ancestor to be visible at all) is invisible to every other
      // assertion here.
      const container = screen.getByTestId("nav-overflow-container");
      expect(container.contains(moreButton)).toBe(true);
      expect(container.className).not.toMatch(/\boverflow-hidden\b/);

      fireEvent.click(moreButton);

      expect(
        await screen.findByRole("menuitem", { name: "Reservations" }),
      ).toHaveAttribute("href", "/dashboard/reservations");
      expect(
        screen.getByRole("menuitem", { name: "Club Settings" }),
      ).toHaveAttribute("href", "/dashboard/settings/club");
    });

    it("never overflows the essential Dashboard item, even when nothing else fits", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ operational: true }),
      });
      stubOffsetWidths({
        containerWidth: 10,
        itemWidths: {
          "/dashboard/courts": 80,
          "/dashboard/reservations": 100,
          "/dashboard/settings/club": 100,
        },
        triggerWidth: 60,
      });
      renderNavLinks("owner", fetchMock, false);

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "More" }),
        ).toBeInTheDocument(),
      );
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
