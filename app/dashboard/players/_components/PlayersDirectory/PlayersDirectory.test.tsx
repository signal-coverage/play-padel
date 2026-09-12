// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayersDirectory } from "./PlayersDirectory";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser } from "@/providers/auth-provider";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: toastMock,
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const PLAYER_A = {
  id: "player_a",
  displayName: "Ana Garcia",
  avatarUrl: null,
  padelCategory: 3,
  preferredSide: "forehand",
  dominantHand: "right",
  email: "ana@example.com",
  phone: "+541100000000",
};

const PLAYER_B = {
  id: "player_b",
  displayName: "Bruno Diaz",
  avatarUrl: null,
  padelCategory: 5,
  preferredSide: "backhand",
  dominantHand: "left",
  email: "bruno@example.com",
  phone: "+541100000001",
};

// A player-role admin — GET /api/players only ever includes isAdmin at all
// for an admin caller (same treatment as email/phone, see that route's own
// comment), so every fixture below that exercises the Role
// column/impersonate-guard sets it explicitly.
const PLAYER_C = {
  id: "player_c",
  displayName: "Carla Lopez",
  avatarUrl: null,
  padelCategory: 4,
  preferredSide: "forehand",
  dominantHand: "right",
  email: "carla@example.com",
  phone: "+541100000002",
  isAdmin: true,
};

function baseUser(overrides: Partial<AppUser>): AppUser {
  return {
    id: "user_1",
    email: "user@example.com",
    displayName: "Test User",
    imageUrl: null,
    firstName: "Test",
    lastName: "User",
    role: "player",
    clubId: null,
    padelCategory: null,
    preferredSide: null,
    dominantHand: null,
    isAdmin: false,
    createdAt: null,
    ...overrides,
  };
}

function mockAuth(overrides: Partial<AppUser>) {
  vi.mocked(useAuth).mockReturnValue({
    user: baseUser(overrides),
    loading: false,
    profileLoading: false,
    signOut: vi.fn(),
    refetchProfile: vi.fn(),
  });
}

function renderDirectory(
  fetchImpl: (url: string, init?: RequestInit) => Promise<unknown>,
) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <PlayersDirectory />
    </QueryClientProvider>,
  );

  return { fetchMock };
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  }) as unknown as Promise<Response>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

describe("PlayersDirectory admin actions", () => {
  it("shows no Actions column for a non-admin player", async () => {
    mockAuth({ isAdmin: false });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit ana garcia/i }),
    ).not.toBeInTheDocument();
  });

  it("shows no Export CSV link for a non-admin player", async () => {
    mockAuth({ isAdmin: false });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    expect(
      screen.queryByRole("link", { name: /export csv/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an Export CSV link pointing at the players export route for an admin", async () => {
    mockAuth({ isAdmin: true });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    const exportLink = screen.getByRole("link", { name: /export csv/i });
    expect(exportLink).toHaveAttribute("href", "/api/admin/export/players");
  });

  it("stacks the filter bar above the Export CSV button on narrow widths instead of squeezing them side by side", async () => {
    mockAuth({ isAdmin: true });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    const toolbar = screen.getByTestId("players-toolbar");
    // flex-col (default, mobile) stacks the filter bar full-width above the
    // Export button; sm:flex-row restores the side-by-side layout once
    // there's enough room — same breakpoint PlayersFilterBar's own internal
    // fields already switch at.
    expect(toolbar.className).toMatch(/\bflex-col\b/);
    expect(toolbar.className).toMatch(/\bsm:flex-row\b/);
  });

  it("gives the players table a taller minimum height on mobile so it scrolls internally, while leaving desktop's flex-1/min-h-0 sizing untouched", async () => {
    mockAuth({ isAdmin: false });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    // On mobile, <main> scrolls the whole page (see DashboardShell.tsx's
    // overflow-y-auto vs. md:overflow-hidden split) instead of giving this
    // tree a definite height to stretch flex-1 against — so a percentage-
    // based h-full/flex-1 chain alone collapses the table to its content's
    // height. min-h-[60svh] doesn't need that definite-height chain (it's
    // relative to the viewport), so it holds regardless; md:min-h-0 restores
    // the exact pre-existing desktop sizing where the chain does work.
    const table = screen.getByRole("table");
    const tableWrapper = table.closest(".rounded-sm.border");
    expect(tableWrapper?.className).toContain("min-h-[60svh]");
    expect(tableWrapper?.className).toMatch(/\bmd:min-h-0\b/);
  });

  it("adds a mobile-only spacer below the table so it doesn't sit flush against the bottom nav once scrolled to the end", async () => {
    mockAuth({ isAdmin: false });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    // A real block spacer (height, not margin/padding) — margin on the
    // table itself doesn't extend <main>'s scrollHeight here, since the
    // table overflows a fixed-height, min-h-0 ancestor (see the spacer's
    // own comment in PlayersDirectory.tsx for the full explanation).
    const table = screen.getByRole("table");
    const spacer = table.closest(".rounded-sm.border")
      ?.nextElementSibling as HTMLElement | null;
    expect(spacer).not.toBeNull();
    expect(spacer?.getAttribute("aria-hidden")).toBe("true");
    expect(spacer?.className).toMatch(/\bh-8\b/);
    expect(spacer?.className).toMatch(/\bmd:hidden\b/);
  });

  it("shows edit and delete icon buttons per row for an admin", async () => {
    mockAuth({ isAdmin: true });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    expect(
      screen.getByRole("button", { name: /edit ana garcia/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete ana garcia/i }),
    ).toBeInTheDocument();
  });

  it("opens the edit sheet pre-filled, submits the PATCH, and reflects the update", async () => {
    mockAuth({ isAdmin: true });
    let players = [PLAYER_A, PLAYER_B];

    const { fetchMock } = renderDirectory((url, init) => {
      if (url === "/api/players") {
        return jsonResponse({ players });
      }
      if (
        typeof url === "string" &&
        url.startsWith("/api/admin/players/") &&
        init?.method === "PATCH"
      ) {
        const patch = JSON.parse(init.body as string);
        players = players.map((p) =>
          p.id === "player_a" ? { ...p, ...patch } : p,
        );
        return jsonResponse({ player: players[0] });
      }
      return jsonResponse({}, false);
    });

    await screen.findByText("Ana Garcia");

    fireEvent.click(screen.getByRole("button", { name: /edit ana garcia/i }));

    const nameInput = await screen.findByLabelText(/^name/i);
    expect(nameInput).toHaveValue("Ana Garcia");

    fireEvent.change(nameInput, { target: { value: "Ana Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/players/player_a",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    await screen.findByText("Ana Updated");
  });

  it("opens ConfirmDialog on delete, confirms, and removes the row", async () => {
    mockAuth({ isAdmin: true });
    let players = [PLAYER_A, PLAYER_B];

    const { fetchMock } = renderDirectory((url, init) => {
      if (url === "/api/players") {
        return jsonResponse({ players });
      }
      if (
        typeof url === "string" &&
        url.startsWith("/api/admin/players/") &&
        init?.method === "DELETE"
      ) {
        players = players.filter((p) => p.id !== "player_a");
        return jsonResponse({ ok: true });
      }
      return jsonResponse({}, false);
    });

    await screen.findByText("Ana Garcia");

    fireEvent.click(screen.getByRole("button", { name: /delete ana garcia/i }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/players/player_a",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Ana Garcia")).not.toBeInTheDocument();
    });
  });

  it("shows no impersonate button for a non-admin player", async () => {
    mockAuth({ isAdmin: false });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    expect(
      screen.queryByRole("button", { name: /impersonate ana garcia/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an impersonate icon button per row for an admin", async () => {
    mockAuth({ isAdmin: true });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    expect(
      screen.getByRole("button", { name: /impersonate ana garcia/i }),
    ).toBeInTheDocument();
  });

  it("calls the impersonate route and opens the returned url in a new tab", async () => {
    mockAuth({ isAdmin: true });
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);

    const { fetchMock } = renderDirectory((url, init) => {
      if (url === "/api/players") {
        return jsonResponse({ players: [PLAYER_A, PLAYER_B] });
      }
      if (url === "/api/admin/impersonate" && init?.method === "POST") {
        return jsonResponse({ url: "https://clerk.example/sign-in-tokens/x" });
      }
      return jsonResponse({}, false);
    });

    await screen.findByText("Ana Garcia");

    fireEvent.click(
      screen.getByRole("button", { name: /impersonate ana garcia/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/impersonate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ userId: "player_a" }),
        }),
      );
    });

    await waitFor(() => {
      expect(openMock).toHaveBeenCalledWith(
        "https://clerk.example/sign-in-tokens/x",
        "_blank",
      );
    });
  });

  it("shows an error toast when the impersonate request fails", async () => {
    mockAuth({ isAdmin: true });
    vi.stubGlobal("open", vi.fn());

    renderDirectory((url) => {
      if (url === "/api/players") {
        return jsonResponse({ players: [PLAYER_A, PLAYER_B] });
      }
      if (url === "/api/admin/impersonate") {
        return jsonResponse(
          { error: "You cannot impersonate yourself." },
          false,
        );
      }
      return jsonResponse({}, false);
    });

    await screen.findByText("Ana Garcia");

    fireEvent.click(
      screen.getByRole("button", { name: /impersonate ana garcia/i }),
    );

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        "You cannot impersonate yourself.",
      );
    });
  });

  it("shows no Role column for a non-admin viewer", async () => {
    mockAuth({ isAdmin: false });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_C] }));

    await screen.findByText("Ana Garcia");

    expect(screen.queryByText("Role")).not.toBeInTheDocument();
  });

  it("shows a Role column with Admin/Player badges for an admin viewer", async () => {
    mockAuth({ isAdmin: true });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_C] }));

    await screen.findByText("Ana Garcia");

    expect(screen.getByText("Role")).toBeInTheDocument();
    // Scoped per row — both badges' labels are generic enough to otherwise
    // collide across rows.
    const anaRow = screen.getByText("Ana Garcia").closest("tr");
    const carlaRow = screen.getByText("Carla Lopez").closest("tr");
    expect(anaRow).not.toBeNull();
    expect(carlaRow).not.toBeNull();
    if (!anaRow || !carlaRow) throw new Error("Row not found");
    expect(within(anaRow).getByText("Player")).toBeInTheDocument();
    expect(within(carlaRow).getByText("Admin")).toBeInTheDocument();
  });

  it("disables the Impersonate button for a listed player who is themselves an admin, since the server rejects it anyway", async () => {
    mockAuth({ isAdmin: true });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_C] }));

    await screen.findByText("Ana Garcia");

    expect(
      screen.getByRole("button", { name: /impersonate ana garcia/i }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /impersonate carla lopez/i }),
    ).toBeDisabled();
  });

  it("disables both Impersonate and Delete for the signed-in admin's own row — the server rejects both self-impersonation and self-deletion the same way it rejects impersonating another admin", async () => {
    // PLAYER_A's id doubles as the mocked signed-in admin's id, same
    // technique as the "current-user badge" describe block below.
    mockAuth({ isAdmin: true, id: PLAYER_A.id });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    expect(
      screen.getByRole("button", { name: /impersonate ana garcia/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /delete ana garcia/i }),
    ).toBeDisabled();

    // Bruno isn't the signed-in admin and isn't an admin himself — neither
    // button should be affected by this guard.
    expect(
      screen.getByRole("button", { name: /impersonate bruno diaz/i }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /delete bruno diaz/i }),
    ).not.toBeDisabled();
  });

  it("wraps every disabled action button in a hoverable/focusable span so its tooltip can still show — a disabled native <button> never fires pointer or focus events on its own", async () => {
    mockAuth({ isAdmin: true, id: PLAYER_A.id });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_C] }));

    await screen.findByText("Ana Garcia");

    // Ana is the signed-in admin (self-guard); Carla is a different admin
    // (isAdmin guard) — both disable Delete and/or Impersonate, so both are
    // real cases this wrapper has to cover.
    const disabledButtons = [
      screen.getByRole("button", { name: /delete ana garcia/i }),
      screen.getByRole("button", { name: /impersonate ana garcia/i }),
      screen.getByRole("button", { name: /impersonate carla lopez/i }),
    ];

    for (const button of disabledButtons) {
      expect(button).toBeDisabled();
      const wrapper = button.parentElement;
      expect(wrapper).not.toBeNull();
      if (!wrapper) throw new Error("Tooltip-trigger wrapper not found");
      expect(wrapper.tagName.toLowerCase()).not.toBe("button");
      expect(wrapper).not.toHaveAttribute("disabled");
      expect(wrapper).toHaveAttribute("tabIndex", "0");
    }
  });
});

describe("PlayersDirectory current-user badge", () => {
  it("shows a You badge next to the logged-in player's own name, and not next to any other player's", async () => {
    // PLAYER_A's id doubles as the mocked signed-in user's id here, so its
    // row is the one that should get the badge.
    mockAuth({ isAdmin: false, id: PLAYER_A.id });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    const anaRow = screen.getByText("Ana Garcia").closest("tr");
    const brunoRow = screen.getByText("Bruno Diaz").closest("tr");
    expect(anaRow).not.toBeNull();
    expect(brunoRow).not.toBeNull();
    if (!anaRow || !brunoRow) throw new Error("Row not found");
    const youBadge = within(anaRow).getByText("You");
    expect(youBadge).toBeInTheDocument();
    // Accent, not the neutral outline every other badge in this table
    // uses (Role/Category) — this one calls out "that's you", not status
    // info, so it should stand out rather than blend in.
    expect(youBadge.className).toMatch(/\bbg-accent\b/);
    expect(youBadge.className).toMatch(/\btext-accent-foreground\b/);
    expect(within(brunoRow).queryByText("You")).not.toBeInTheDocument();
  });

  it("shows no You badge at all when the signed-in user isn't in the visible player list", async () => {
    mockAuth({ isAdmin: false, id: "someone_else" });
    renderDirectory(() => jsonResponse({ players: [PLAYER_A, PLAYER_B] }));

    await screen.findByText("Ana Garcia");

    expect(screen.queryByText("You")).not.toBeInTheDocument();
  });
});
