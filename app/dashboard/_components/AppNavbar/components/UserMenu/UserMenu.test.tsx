// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useClerk } from "@clerk/nextjs";
import type { AppUser } from "@/providers/auth-provider";
import { UserMenu } from "./UserMenu";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useClerk: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "user_1",
    email: "owner@example.com",
    displayName: "Owner",
    imageUrl: null,
    firstName: "Owner",
    lastName: null,
    role: "owner",
    clubId: "club_1",
    padelCategory: null,
    preferredSide: null,
    dominantHand: null,
    isAdmin: false,
    createdAt: null,
    ...overrides,
  };
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

function renderUserMenu(
  user: ReturnType<typeof makeUser> | null,
  fetchImpl: (url: string) => Promise<unknown>,
) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    loading: false,
    profileLoading: false,
    signOut: vi.fn(),
    refetchProfile: vi.fn(),
  });
  vi.mocked(useClerk).mockReturnValue({
    openUserProfile: vi.fn(),
  } as unknown as ReturnType<typeof useClerk>);
  vi.stubGlobal("fetch", vi.fn(fetchImpl));

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <UserMenu />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function fetchImplFor(
  cause: "MP_NOT_CONNECTED" | "CLUB_INACTIVE" | "PENDING_APPROVAL" | null,
  membershipStatus: string | null,
) {
  return async (url: string) => {
    if (url === "/api/clubs/mercadopago/operational-status") {
      return jsonResponse({ operational: cause === null, cause });
    }
    if (url === "/api/clubs/membership") {
      return jsonResponse({
        subscription: membershipStatus
          ? { plan: "PRO", status: membershipStatus }
          : null,
      });
    }
    return jsonResponse({});
  };
}

// Radix's DropdownMenuTrigger opens on pointerdown, not a plain click — a
// bare fireEvent.click never opens it in jsdom (no real Pointer Events
// support), so this fires the same pointerDown -> click sequence a real
// mouse interaction produces.
async function openMenu() {
  const trigger = screen.getByRole("button");
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.click(trigger);
  await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
}

describe("UserMenu — Club Settings visibility", () => {
  it("shows Club Settings for an owner whose club is approved and membership is active", async () => {
    renderUserMenu(makeUser(), fetchImplFor(null, "ACTIVE"));
    await openMenu();

    expect(
      await screen.findByRole("menuitem", { name: /club settings/i }),
    ).toBeInTheDocument();
  });

  it("shows Club Settings while the membership is still TRIALING (also counts as confirmed)", async () => {
    renderUserMenu(makeUser(), fetchImplFor(null, "TRIALING"));
    await openMenu();

    expect(
      await screen.findByRole("menuitem", { name: /club settings/i }),
    ).toBeInTheDocument();
  });

  it("hides Club Settings while the club is still pending admin approval", async () => {
    renderUserMenu(makeUser(), fetchImplFor("PENDING_APPROVAL", "ACTIVE"));
    await openMenu();

    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: /account settings/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("menuitem", { name: /club settings/i }),
    ).not.toBeInTheDocument();
  });

  it("hides Club Settings when the club is approved but has no confirmed membership", async () => {
    renderUserMenu(makeUser(), fetchImplFor(null, "PENDING"));
    await openMenu();

    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: /account settings/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("menuitem", { name: /club settings/i }),
    ).not.toBeInTheDocument();
  });

  it("hides Club Settings when there is no membership subscription at all yet", async () => {
    renderUserMenu(makeUser(), fetchImplFor(null, null));
    await openMenu();

    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: /account settings/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("menuitem", { name: /club settings/i }),
    ).not.toBeInTheDocument();
  });

  it("never shows Club Settings for a player, regardless of club status", async () => {
    renderUserMenu(
      makeUser({ role: "player", clubId: null }),
      fetchImplFor(null, "ACTIVE"),
    );
    await openMenu();

    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: /account settings/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("menuitem", { name: /club settings/i }),
    ).not.toBeInTheDocument();
  });
});
