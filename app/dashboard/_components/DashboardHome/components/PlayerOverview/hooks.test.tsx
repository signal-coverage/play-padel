// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/use-auth";
import {
  usePlayerOverviewData,
  useLatestPartner,
  usePerformanceSummary,
} from "./hooks";

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;

const PARTNER = {
  id: "partner_1",
  name: "Sofía Martínez",
  avatarUrl: null,
  timesPlayedTogether: 5,
  lastPlayedLabel: "3 days ago",
  padelCategory: 3,
  preferredSide: "backhand",
  dominantHand: "right",
  email: "sofia@example.com",
  phone: null,
};

const PERFORMANCE = {
  tournamentsWon: 2,
  tournamentsPlayed: 5,
  latestTournamentName: "Summer Open",
  latestResults: ["W", "L", "W"],
};

// Routes each fetch call to a response by URL, so a test can exercise both
// /api/player/latest-partner and /api/tournaments/performance-summary in the
// same render (usePlayerOverviewData wires both) without one silently
// resolving with the other's body.
function stubFetchByUrl(responses: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => responses[url],
    })),
  );
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  useAuthMock.mockReturnValue({
    user: { preferredSide: null, dominantHand: null },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useLatestPartner", () => {
  it("returns the fetched partner on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ partner: PARTNER }),
      }),
    );

    const { result } = renderHook(() => useLatestPartner(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(PARTNER));
  });

  it("returns null when the player has no partner history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ partner: null }),
      }),
    );

    const { result } = renderHook(() => useLatestPartner(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe("usePerformanceSummary", () => {
  it("returns the fetched performance summary on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ performance: PERFORMANCE }),
      }),
    );

    const { result } = renderHook(() => usePerformanceSummary(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(PERFORMANCE));
  });

  it("surfaces the server error message on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      }),
    );

    const { result } = renderHook(() => usePerformanceSummary(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error("Unauthorized"));
  });
});

describe("usePlayerOverviewData", () => {
  it("wires the fetched partner and real performance summary into the returned data", async () => {
    stubFetchByUrl({
      "/api/player/latest-partner": { partner: PARTNER },
      "/api/tournaments/performance-summary": { performance: PERFORMANCE },
    });

    const { result } = renderHook(() => usePlayerOverviewData(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.partner).toEqual(PARTNER));
    await waitFor(() =>
      expect(result.current.performance).toEqual(PERFORMANCE),
    );
    // user.preferredSide/dominantHand are null in this test's useAuth mock,
    // so usePlayerOverviewData falls back to MOCK_PLAYER_STYLE — unrelated
    // to (and unchanged by) this task's Latest Partner work.
    expect(result.current.playerStyle).toEqual({
      preferredSide: "forehand",
      dominantHand: "right",
    });
  });

  it("falls back to null partner / a zero-value performance summary before either fetch resolves", async () => {
    stubFetchByUrl({
      "/api/player/latest-partner": { partner: null },
      "/api/tournaments/performance-summary": {
        performance: {
          tournamentsWon: 0,
          tournamentsPlayed: 0,
          latestTournamentName: "",
          latestResults: [],
        },
      },
    });

    const { result } = renderHook(() => usePlayerOverviewData(), {
      wrapper: makeWrapper(),
    });

    // Before either query resolves, the returned shape must already be
    // usable (no undefined `performance`) since PerformanceSummarySection
    // renders it unconditionally -- there is no loading/null branch there.
    expect(result.current.partner).toBeNull();
    expect(result.current.performance).toEqual({
      tournamentsWon: 0,
      tournamentsPlayed: 0,
      latestTournamentName: "",
      latestResults: [],
    });

    await waitFor(() => expect(result.current.partner).toBeNull());
    await waitFor(() =>
      expect(result.current.performance).toEqual({
        tournamentsWon: 0,
        tournamentsPlayed: 0,
        latestTournamentName: "",
        latestResults: [],
      }),
    );
  });
});
