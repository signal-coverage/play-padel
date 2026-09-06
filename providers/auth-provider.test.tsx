// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AuthProvider } from "./auth-provider";
import { useAuth } from "@/hooks/use-auth";

// Real `@clerk/nextjs` isn't installed for direct import in tests (every
// other test file in this repo mocks this app's own thin `@/hooks/use-auth`
// wrapper instead) — this is the one file that sits BELOW that wrapper, so
// it has to mock Clerk's own hooks directly.
const { useUserMock, signOutMock } = vi.hoisted(() => ({
  useUserMock: vi.fn(),
  signOutMock: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: useUserMock,
  useClerk: () => ({ signOut: signOutMock }),
}));

const CLERK_USER = {
  id: "user_1",
  primaryEmailAddress: { emailAddress: "owner@club.com" },
  fullName: "Owner Test",
  imageUrl: null,
  firstName: "Owner",
  lastName: "Test",
};

function Probe() {
  const { user, profileLoading } = useAuth();
  if (profileLoading) return <div>loading</div>;
  return (
    <div>
      <div>role: {user?.role ?? "none"}</div>
      <div>isAdmin: {String(user?.isAdmin ?? false)}</div>
    </div>
  );
}

function renderProbe() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  useUserMock.mockReturnValue({ user: CLERK_USER, isLoaded: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AuthProvider", () => {
  // Regression: a single transient /api/me failure (e.g. a dev-server
  // cold-start 404 on the route itself, reproduced live) used to be
  // silently coerced into "profile: null" with no retry — permanently
  // convincing an already-onboarded owner's client that they had no
  // profile, while the server-side onboarding layout (reading Prisma
  // directly, unaffected by this) kept correctly bouncing them back to
  // /dashboard. Neither side ever re-checked, so the two disagreed forever:
  // an infinite /dashboard <-> /onboarding loop with only ONE /api/me call
  // ever logged.
  it("retries after a transient /api/me failure instead of permanently treating it as no profile", async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          profile: {
            role: "owner",
            clubId: "club_1",
            padelCategory: null,
            preferredSide: null,
            dominantHand: null,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    renderProbe();

    await waitFor(
      () => {
        expect(screen.getByText("role: owner")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(calls).toBeGreaterThan(1);
  });

  // A 401 ("not authenticated") is an authoritative answer, not a transient
  // failure — retrying it would just waste time before settling on the same
  // "no profile" result.
  it("does not retry a 401 (genuinely not authenticated)", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ profile: null }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    renderProbe();

    await waitFor(() => {
      expect(screen.getByText("role: none")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // New, additive field alongside role/clubId (see prisma/schema.prisma's
  // UserProfile.isAdmin) — must flow through the exact same /api/me ->
  // AppUser path those already do.
  it("threads isAdmin through from the /api/me profile response", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          role: "player",
          clubId: null,
          padelCategory: null,
          preferredSide: null,
          dominantHand: null,
          isAdmin: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    renderProbe();

    await waitFor(() => {
      expect(screen.getByText("isAdmin: true")).toBeInTheDocument();
    });
  });

  it("defaults isAdmin to false when the profile response omits it", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          role: "player",
          clubId: null,
          padelCategory: null,
          preferredSide: null,
          dominantHand: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    renderProbe();

    await waitFor(() => {
      expect(screen.getByText("isAdmin: false")).toBeInTheDocument();
    });
  });
});
