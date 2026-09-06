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

// Mocked the same way BulkEditCourtsSheet.test.tsx mocks it, so
// toast.success/error calls made on save can be asserted on.
const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: toastMock,
}));

import ClubStatusAdminPage from "./page";

// jsdom doesn't implement ResizeObserver or scrollIntoView, but Radix
// Select (used for the status field) relies on both internally — stub
// no-ops the same way BulkEditCourtsSheet.test.tsx / CommandPalette.test.tsx
// do for other Radix/cmdk components.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubFetch(
  fetchImpl: (url: string, init?: RequestInit) => Promise<unknown>,
) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
  return fetchMock;
}

const CLUB = {
  id: "club_1",
  name: "Test Padel Club",
  status: "ACTIVE",
  updatedBy: "someone@example.com",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// No admin-secret field anymore — the page is only reachable at all once
// app/admin/layout.tsx has already confirmed a real Clerk admin session, and
// every fetch here rides the same-origin session cookie automatically.
function fillLookupInputs(clubId = "club_1") {
  fireEvent.change(screen.getByLabelText(/club id/i), {
    target: { value: clubId },
  });
}

beforeEach(() => {
  toastMock.success.mockClear();
  toastMock.error.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ClubStatusAdminPage", () => {
  it("has no admin-secret input at all", () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ club: CLUB }) }));

    render(<ClubStatusAdminPage />);

    expect(screen.queryByLabelText(/admin secret/i)).not.toBeInTheDocument();
  });

  it("looks up a club with no Authorization header, and renders its status", async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (url === "/api/admin/club-status?clubId=club_1") {
        expect(
          (init?.headers as Record<string, string> | undefined)?.Authorization,
        ).toBeUndefined();
        return { ok: true, json: async () => ({ club: CLUB }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    render(<ClubStatusAdminPage />);
    fillLookupInputs();
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));

    await waitFor(() => {
      expect(screen.getByText("Test Padel Club")).toBeInTheDocument();
    });
    expect(screen.getByText(/ACTIVE/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows "Club not found" on a 404 lookup response', async () => {
    stubFetch(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: "Club not found" }),
    }));

    render(<ClubStatusAdminPage />);
    fillLookupInputs();
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));

    await waitFor(() => {
      expect(screen.getByText("Club not found")).toBeInTheDocument();
    });
  });

  it("saves a new status with the correct body and no Authorization header, and shows a success toast", async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (init?.method === "PATCH" && url === "/api/admin/club-status") {
        const body = JSON.parse(init.body as string);
        expect(body).toEqual({
          clubId: "club_1",
          status: "SUSPENDED",
          updatedBy: "admin@example.com",
        });
        expect(
          (init.headers as Record<string, string> | undefined)?.Authorization,
        ).toBeUndefined();
        return {
          ok: true,
          json: async () => ({
            club: {
              ...CLUB,
              status: "SUSPENDED",
              updatedBy: "admin@example.com",
            },
          }),
        };
      }
      return { ok: true, json: async () => ({ club: CLUB }) };
    });

    render(<ClubStatusAdminPage />);
    fillLookupInputs();
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    await waitFor(() => {
      expect(screen.getByText("Test Padel Club")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("combobox", { name: /new status/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Suspended" }));

    fireEvent.change(screen.getByLabelText(/updated by/i), {
      target: { value: "admin@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalled();
    });

    const patchCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(1);
  });

  it("activates the free plan with the correct body and no Authorization header after confirmation, and shows a success toast", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = stubFetch(async (url, init) => {
      if (
        init?.method === "POST" &&
        url === "/api/admin/membership-free-plan"
      ) {
        const body = JSON.parse(init.body as string);
        expect(body).toEqual({ clubId: "club_1" });
        expect(
          (init.headers as Record<string, string> | undefined)?.Authorization,
        ).toBeUndefined();
        return {
          ok: true,
          json: async () => ({
            subscription: { id: "sub_1", plan: "FREE", status: "ACTIVE" },
          }),
        };
      }
      return { ok: true, json: async () => ({ club: CLUB }) };
    });

    render(<ClubStatusAdminPage />);
    fillLookupInputs();
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    await waitFor(() => {
      expect(screen.getByText("Test Padel Club")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /activate free membership/i }),
    );

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalled();
    });

    expect(confirmSpy).toHaveBeenCalled();
    const postCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(postCalls).toHaveLength(1);
  });

  it("does not call the free-plan route when the confirmation dialog is dismissed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = stubFetch(async () => ({
      ok: true,
      json: async () => ({ club: CLUB }),
    }));

    render(<ClubStatusAdminPage />);
    fillLookupInputs();
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    await waitFor(() => {
      expect(screen.getByText("Test Padel Club")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /activate free membership/i }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1); // lookup only
  });

  it("shows the route's conflict message via the error-toast path when the club already has a real subscription", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    stubFetch(async (url, init) => {
      if (
        init?.method === "POST" &&
        url === "/api/admin/membership-free-plan"
      ) {
        return {
          ok: false,
          status: 409,
          json: async () => ({
            error:
              "Club already has a real Mercado Pago subscription — pass force to override",
          }),
        };
      }
      return { ok: true, json: async () => ({ club: CLUB }) };
    });

    render(<ClubStatusAdminPage />);
    fillLookupInputs();
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    await waitFor(() => {
      expect(screen.getByText("Test Padel Club")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /activate free membership/i }),
    );

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        "Club already has a real Mercado Pago subscription — pass force to override",
      );
    });
  });

  it("disables Save while the updated-by field is empty", async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ club: CLUB }) }));

    render(<ClubStatusAdminPage />);
    fillLookupInputs();
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    await waitFor(() => {
      expect(screen.getByText("Test Padel Club")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();
  });
});
