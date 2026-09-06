// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
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
  } = {},
) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/admin/clubs") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          clubs: [
            { id: "club_1", name: "Club A", status: "ACTIVE", plan: "PRO" },
            {
              id: "club_2",
              name: "Club B",
              status: "SUSPENDED",
              plan: "BASIC",
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
});
