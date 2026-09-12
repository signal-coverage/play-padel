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
import { AdminClubSettingsView } from "./AdminClubSettingsView";

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: toastMock,
}));

// Defaults to no `clubId` param — most tests below don't care about the
// deep-link pre-selection. The dedicated describe block further down
// overrides this per-test via `currentSearchParams`.
let currentSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => currentSearchParams,
}));

// jsdom doesn't implement ResizeObserver, but Radix-backed fields (Switch,
// inside the nested ClubSettingsView) rely on it internally — same stub
// CourtFormSheet.test.tsx/CourtsView.test.tsx already use.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom doesn't implement matchMedia either — the nested ClubSettingsView's
// TabColumnsLayout (columns="two") calls useShouldStackTabColumns unconditionally.
function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

function makeClubDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "club_1",
    name: "Club A",
    legalName: "",
    taxId: "",
    email: "a@example.com",
    phone: "",
    ownerPhotoUrl: null,
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    ...overrides,
  };
}

function renderView(
  overrides: {
    onImpersonate?: (url: string, init?: RequestInit) => Promise<unknown>;
    onActivateFreePlan?: (
      url: string,
      init?: RequestInit,
    ) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;
    onSetCourtLimit?: (
      url: string,
      init?: RequestInit,
    ) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;
    clubs?: Array<Record<string, unknown>>;
  } = {},
) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (
      init?.method === "PATCH" &&
      url.startsWith("/api/admin/clubs/") &&
      overrides.onSetCourtLimit
    ) {
      return overrides.onSetCourtLimit(url, init);
    }
    if (url === "/api/admin/clubs") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          clubs: overrides.clubs ?? [
            {
              id: "club_1",
              name: "Club A",
              status: "ACTIVE",
              plan: "PRO",
              isFreePlan: false,
            },
            {
              id: "club_2",
              name: "Club B",
              status: "SUSPENDED",
              plan: "BASIC",
              isFreePlan: false,
            },
          ],
        }),
      });
    }
    if (url === "/api/admin/clubs/club_1") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          club: makeClubDetail({ id: "club_1", name: "Club A" }),
          owner: { id: "owner_1", displayName: "Owner One" },
        }),
      });
    }
    if (url === "/api/admin/clubs/club_2") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          club: makeClubDetail({ id: "club_2", name: "Club B" }),
          owner: { id: "owner_2", displayName: "Owner Two" },
        }),
      });
    }
    if (url === "/api/admin/impersonate" && overrides.onImpersonate) {
      return overrides.onImpersonate(url, init).then((body) => ({
        ok: true,
        json: async () => body,
      }));
    }
    if (
      url === "/api/admin/membership-free-plan" &&
      overrides.onActivateFreePlan
    ) {
      return overrides.onActivateFreePlan(url, init);
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  stubMatchMedia();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <AdminClubSettingsView />
      </QueryClientProvider>,
    ),
    fetchMock,
  };
}

describe("AdminClubSettingsView", () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it("stacks the club list above the settings panel on mobile instead of squeezing them side by side", async () => {
    renderView();

    await waitFor(() => expect(screen.getByText("Club A")).toBeInTheDocument());

    // flex-col by default (mobile) stacks the list full-width above the
    // settings panel; md:flex-row restores the side-by-side master-detail
    // layout once there's enough width for it — same breakpoint the two
    // columns' own width classes switch at below.
    const root = screen.getByTestId("admin-club-settings-root");
    expect(root.className).toMatch(/\bflex-col\b/);
    expect(root.className).toMatch(/\bmd:flex-row\b/);

    // The list column must not be capped to a narrow desktop-picker width
    // while stacked (that's what previously squeezed the settings panel
    // into a sliver next to it on mobile) — the max-w-xs/shrink-0/basis
    // constraints only apply once flex-row kicks in at md.
    const listColumn = screen.getByTestId("admin-club-settings-list-column");
    expect(listColumn.className).toMatch(/\bw-full\b/);
    expect(listColumn.className).not.toMatch(/(?<!md:)\bmax-w-xs\b/);
    expect(listColumn.className).toMatch(/\bmd:max-w-xs\b/);
    expect(listColumn.className).toMatch(/\bmd:shrink-0\b/);

    // Same reasoning for the settings column's flex-1 — only meaningful
    // once the columns sit side by side.
    const detailColumn = screen.getByTestId(
      "admin-club-settings-detail-column",
    );
    expect(detailColumn.className).not.toMatch(/(?<!md:)\bflex-1\b/);
    expect(detailColumn.className).toMatch(/\bmd:flex-1\b/);
  });

  it("renders the club list from GET /api/admin/clubs", async () => {
    renderView();

    await waitFor(() => expect(screen.getByText("Club A")).toBeInTheDocument());
    expect(screen.getByText("Club B")).toBeInTheDocument();
  });

  it("shows a placeholder before any club is selected", async () => {
    renderView();

    await waitFor(() => expect(screen.getByText("Club A")).toBeInTheDocument());
    expect(
      screen.getByText(/select a club to view its settings/i),
    ).toBeInTheDocument();
  });

  it("selecting a club renders ClubSettingsView scoped to it", async () => {
    renderView();

    await waitFor(() => expect(screen.getByText("Club A")).toBeInTheDocument());
    screen.getByText("Club A").click();

    await waitFor(() =>
      expect(screen.getByDisplayValue("Club A")).toBeInTheDocument(),
    );
  });

  it("switching the selected club does not leak stale data from the previous club", async () => {
    renderView();

    await waitFor(() => expect(screen.getByText("Club A")).toBeInTheDocument());
    screen.getByText("Club A").click();
    await waitFor(() =>
      expect(screen.getByDisplayValue("Club A")).toBeInTheDocument(),
    );

    screen.getByText("Club B").click();

    await waitFor(() =>
      expect(screen.getByDisplayValue("Club B")).toBeInTheDocument(),
    );
    expect(screen.queryByDisplayValue("Club A")).not.toBeInTheDocument();
  });

  // Deep-link support for app/dashboard/admin-search: clicking a club search
  // result lands here with ?clubId=<id> already set, so the admin doesn't
  // have to find and click the same club again in the picker list.
  describe("AdminClubSettingsView export", () => {
    it("renders an Export CSV link in the top-level bar (outside the list/detail columns) before any club is selected", async () => {
      renderView();

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      const exportLink = screen.getByRole("link", { name: /export csv/i });
      expect(exportLink).toHaveAttribute("href", "/api/admin/export/clubs");
      // The button now lives in AdminClubSettingsView's own top bar, not
      // nested inside AdminClubList's list column — this is what
      // distinguishes the new top-level bar from the old location, since
      // AdminClubList itself is always mounted regardless of selection.
      expect(
        exportLink.closest('[data-testid="admin-club-settings-list-column"]'),
      ).toBeNull();
    });

    it("keeps rendering the Export CSV link outside the columns once a club is selected", async () => {
      renderView();

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();

      await waitFor(() =>
        expect(screen.getByDisplayValue("Club A")).toBeInTheDocument(),
      );
      const exportLink = screen.getByRole("link", { name: /export csv/i });
      expect(exportLink).toHaveAttribute("href", "/api/admin/export/clubs");
      expect(
        exportLink.closest('[data-testid="admin-club-settings-list-column"]'),
      ).toBeNull();
      expect(
        exportLink.closest('[data-testid="admin-club-settings-detail-column"]'),
      ).toBeNull();
    });
  });

  describe("clubId deep-link pre-selection", () => {
    it("pre-selects the club named by the ?clubId search param on mount", async () => {
      currentSearchParams = new URLSearchParams("clubId=club_2");
      renderView();

      await waitFor(() =>
        expect(screen.getByDisplayValue("Club B")).toBeInTheDocument(),
      );
      // The placeholder never shows — the club is selected from the start,
      // not clicked into afterward.
      expect(
        screen.queryByText(/select a club to view its settings/i),
      ).not.toBeInTheDocument();
    });

    it("falls back to the placeholder when no clubId param is present", async () => {
      renderView();

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      expect(
        screen.getByText(/select a club to view its settings/i),
      ).toBeInTheDocument();
    });
  });

  describe("impersonate owner", () => {
    it("shows no Impersonate owner button before a club is selected", async () => {
      renderView();

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("button", { name: /impersonate owner/i }),
      ).not.toBeInTheDocument();
    });

    it("shows an Impersonate owner button once a club is selected", async () => {
      renderView();

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();

      expect(
        await screen.findByRole("button", { name: /impersonate owner/i }),
      ).toBeInTheDocument();
    });

    it("calls the impersonate route with the selected club's owner userId and opens the returned url", async () => {
      const openMock = vi.fn();
      vi.stubGlobal("open", openMock);

      const { fetchMock } = renderView({
        onImpersonate: async () => ({
          url: "https://clerk.example/sign-in-tokens/owner-1",
        }),
      });

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();

      const button = await screen.findByRole("button", {
        name: /impersonate owner/i,
      });
      button.click();

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/admin/impersonate",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ userId: "owner_1" }),
          }),
        );
      });

      await waitFor(() => {
        expect(openMock).toHaveBeenCalledWith(
          "https://clerk.example/sign-in-tokens/owner-1",
          "_blank",
        );
      });
    });

    it("wires the button to the newly selected club's owner after switching clubs", async () => {
      vi.stubGlobal("open", vi.fn());

      const { fetchMock } = renderView({
        onImpersonate: async () => ({
          url: "https://clerk.example/sign-in-tokens/owner-2",
        }),
      });

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();
      await screen.findByRole("button", { name: /impersonate owner/i });

      screen.getByText("Club B").click();
      await waitFor(() =>
        expect(screen.getByDisplayValue("Club B")).toBeInTheDocument(),
      );

      const button = screen.getByRole("button", { name: /impersonate owner/i });
      button.click();

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/admin/impersonate",
          expect.objectContaining({
            body: JSON.stringify({ userId: "owner_2" }),
          }),
        );
      });
    });
  });

  describe("activate free plan", () => {
    it("shows an Activate free plan button for a club not already on FREE", async () => {
      renderView();

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();

      expect(
        await screen.findByRole("button", { name: /activate free plan/i }),
      ).toBeInTheDocument();
    });

    // Regression test: the button's visibility must key off isFreePlan (the
    // actual membership subscription's plan, set by activateFreePlan), NOT
    // the never-changing Club.plan court-capacity tier — otherwise the
    // button never goes away even after a club has already been comped to
    // free. `plan` is deliberately left as "BASIC" here to prove that.
    it("hides the Activate free plan button once the selected club's isFreePlan is true, regardless of club.plan", async () => {
      renderView({
        clubs: [
          {
            id: "club_1",
            name: "Club A",
            status: "ACTIVE",
            plan: "BASIC",
            isFreePlan: true,
          },
        ],
      });

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();

      await waitFor(() =>
        expect(screen.getByDisplayValue("Club A")).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("button", { name: /activate free plan/i }),
      ).not.toBeInTheDocument();
    });

    it("shows the Activate free plan button when the selected club's isFreePlan is false", async () => {
      renderView({
        clubs: [
          {
            id: "club_1",
            name: "Club A",
            status: "ACTIVE",
            plan: "PRO",
            isFreePlan: false,
          },
        ],
      });

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();

      expect(
        await screen.findByRole("button", { name: /activate free plan/i }),
      ).toBeInTheDocument();
    });

    it("does nothing if the confirm dialog is dismissed", async () => {
      vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
      const { fetchMock } = renderView();

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();
      const button = await screen.findByRole("button", {
        name: /activate free plan/i,
      });
      button.click();

      expect(fetchMock).not.toHaveBeenCalledWith(
        "/api/admin/membership-free-plan",
        expect.anything(),
      );
    });

    it("calls the membership-free-plan route with the selected club's id once confirmed, and shows a success toast", async () => {
      vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
      const { fetchMock } = renderView({
        onActivateFreePlan: async () =>
          ({ ok: true, json: async () => ({ subscription: {} }) }) as {
            ok: boolean;
            json: () => Promise<unknown>;
          },
      });

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();
      const button = await screen.findByRole("button", {
        name: /activate free plan/i,
      });
      button.click();

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/admin/membership-free-plan",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ clubId: "club_1" }),
          }),
        ),
      );
      await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    });

    it("shows an error toast when the request fails (e.g. a real subscription already exists)", async () => {
      vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
      renderView({
        onActivateFreePlan: async () =>
          ({
            ok: false,
            json: async () => ({
              error:
                "Club already has a real Mercado Pago subscription — pass force to override",
            }),
          }) as { ok: boolean; json: () => Promise<unknown> },
      });

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();
      const button = await screen.findByRole("button", {
        name: /activate free plan/i,
      });
      button.click();

      await waitFor(() =>
        expect(toastMock.error).toHaveBeenCalledWith(
          "Club already has a real Mercado Pago subscription — pass force to override",
        ),
      );
    });
  });

  describe("court limit override (MAX plan only)", () => {
    it("shows no court limit control for a non-MAX club", async () => {
      renderView(); // default fixture: club_1 is plan PRO

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();

      await waitFor(() =>
        expect(screen.getByDisplayValue("Club A")).toBeInTheDocument(),
      );
      expect(screen.queryByLabelText(/court limit/i)).not.toBeInTheDocument();
    });

    it("shows a court limit input pre-filled with the club's current override for a MAX-plan club", async () => {
      renderView({
        clubs: [
          {
            id: "club_1",
            name: "Club A",
            status: "ACTIVE",
            plan: "MAX",
            courtLimit: 15,
            isFreePlan: false,
          },
        ],
      });

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();

      expect(await screen.findByLabelText(/court limit/i)).toHaveValue(15);
    });

    it("shows an empty court limit input when a MAX-plan club has no override set yet", async () => {
      renderView({
        clubs: [
          {
            id: "club_1",
            name: "Club A",
            status: "ACTIVE",
            plan: "MAX",
            courtLimit: null,
            isFreePlan: false,
          },
        ],
      });

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();

      expect(await screen.findByLabelText(/court limit/i)).toHaveValue(null);
    });

    it("saves the entered court limit via PATCH /api/admin/clubs/[clubId], and shows a success toast", async () => {
      const { fetchMock } = renderView({
        clubs: [
          {
            id: "club_1",
            name: "Club A",
            status: "ACTIVE",
            plan: "MAX",
            courtLimit: null,
            isFreePlan: false,
          },
        ],
        onSetCourtLimit: async () =>
          ({ ok: true, json: async () => ({ club: {} }) }) as {
            ok: boolean;
            json: () => Promise<unknown>;
          },
      });

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();

      const input = await screen.findByLabelText(/court limit/i);
      fireEvent.change(input, { target: { value: "20" } });
      screen.getByRole("button", { name: /save limit/i }).click();

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/admin/clubs/club_1",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ courtLimit: 20 }),
          }),
        ),
      );
      await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    });

    it("shows an error toast when saving the court limit fails", async () => {
      renderView({
        clubs: [
          {
            id: "club_1",
            name: "Club A",
            status: "ACTIVE",
            plan: "MAX",
            courtLimit: 10,
            isFreePlan: false,
          },
        ],
        onSetCourtLimit: async () =>
          ({
            ok: false,
            json: async () => ({ error: "Failed to update club" }),
          }) as { ok: boolean; json: () => Promise<unknown> },
      });

      await waitFor(() =>
        expect(screen.getByText("Club A")).toBeInTheDocument(),
      );
      screen.getByText("Club A").click();
      await screen.findByLabelText(/court limit/i);
      screen.getByRole("button", { name: /save limit/i }).click();

      await waitFor(() =>
        expect(toastMock.error).toHaveBeenCalledWith("Failed to update club"),
      );
    });
  });
});
