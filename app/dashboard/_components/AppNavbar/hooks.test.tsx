// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useOpenTournamentsStatus, useVisibleNavLinks } from "./hooks";

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

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useOpenTournamentsStatus", () => {
  it("never fetches for an owner", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useOpenTournamentsStatus("owner"), {
      wrapper: makeWrapper(),
    });

    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches /api/tournaments/open for a player", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ tournaments: [] }));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useOpenTournamentsStatus("player"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/tournaments/open"),
    );
  });

  it("returns anyOpen: false and badge: null when there are no open tournaments", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ tournaments: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useOpenTournamentsStatus("player"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.anyOpen).toBe(false));
    expect(result.current.badge).toBeNull();
  });

  it('returns badge: "open" when a tournament is open but published over 48h ago', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        tournaments: [
          {
            id: "t1",
            publishedAt: new Date(
              Date.now() - 49 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useOpenTournamentsStatus("player"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.anyOpen).toBe(true));
    expect(result.current.badge).toBe("open");
  });

  it('returns badge: "new" when a tournament was published under 48h ago', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        tournaments: [
          {
            id: "t1",
            publishedAt: new Date(
              Date.now() - 47 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useOpenTournamentsStatus("player"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.anyOpen).toBe(true));
    expect(result.current.badge).toBe("new");
  });

  it('returns badge: "open" (not "new") at exactly the 48h boundary', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        tournaments: [
          {
            id: "t1",
            publishedAt: new Date(
              Date.now() - 48 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useOpenTournamentsStatus("player"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.anyOpen).toBe(true));
    expect(result.current.badge).toBe("open");
  });

  it('returns "new" when ANY open tournament (not just the first) was recently published', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        tournaments: [
          {
            id: "old",
            publishedAt: new Date(
              Date.now() - 100 * 60 * 60 * 1000,
            ).toISOString(),
          },
          {
            id: "recent",
            publishedAt: new Date(Date.now() - 1000).toISOString(),
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useOpenTournamentsStatus("player"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.anyOpen).toBe(true));
    expect(result.current.badge).toBe("new");
  });
});

// Connecting a real payout method (Mercado Pago or bank transfer) is a
// required step for every owner, regardless of plan — no FREE-plan bypass
// here (deliberately removed, see ClubOperationalGate.tsx's own identical
// removal): a confirmed FREE-plan club with no payout method must still see
// only the essential Dashboard link, same as any other non-operational club.
describe("useVisibleNavLinks", () => {
  function mockFetch(operationalBody: object) {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/mercadopago/operational-status")) {
        return Promise.resolve({
          ok: true,
          json: async () => operationalBody,
        });
      }
      if (url === "/api/tournaments/open") {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("narrows to the essential-only nav for a non-operational club, MP_NOT_CONNECTED, regardless of plan", async () => {
    mockFetch({ operational: false, cause: "MP_NOT_CONNECTED" });

    const { result } = renderHook(() => useVisibleNavLinks("owner"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() =>
      expect(result.current.map((link) => link.href)).toEqual(["/dashboard"]),
    );
  });

  it("shows the full owner nav once the club is confirmed operational", async () => {
    mockFetch({ operational: true, cause: null });

    const { result } = renderHook(() => useVisibleNavLinks("owner"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() =>
      expect(result.current.map((link) => link.href)).toContain(
        "/dashboard/courts",
      ),
    );
  });
});
