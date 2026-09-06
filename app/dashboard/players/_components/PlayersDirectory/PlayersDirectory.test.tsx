// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
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
});
