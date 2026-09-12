// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ClubBrowseSummary, RawCourt } from "./types";

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "me" } }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  // Forces the desktop dialog variant so this test only has one code path
  // to drive — BookingConfirmDialog itself picks desktop/mobile purely off
  // this hook (see BookingConfirmDialog.tsx).
  useIsMobile: () => false,
}));

const { fireSuccessCelebrationMock } = vi.hoisted(() => ({
  fireSuccessCelebrationMock: vi.fn(),
}));
vi.mock("@/lib/utils/celebration", () => ({
  fireSuccessCelebration: fireSuccessCelebrationMock,
}));

const { useReducedMotionMock } = vi.hoisted(() => ({
  useReducedMotionMock: vi.fn(() => true as boolean | null),
}));
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: useReducedMotionMock };
});

// Stubbed out to keep this test focused on the payment-method wiring: the
// real PartnerPicker performs its own player-search fetch/query, unrelated
// to what this test verifies.
vi.mock("./components/BookingConfirmDialog/components/PartnerPicker", () => ({
  PartnerPicker: () => null,
}));

const useActiveClubsMock = vi.fn();
const useClubAvailabilityMock = vi.fn();
const useJoinWaitlistMock = vi.fn();
vi.mock("./hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./hooks")>();
  return {
    ...actual,
    // useBookSlot is kept as the REAL implementation (real fetch + real
    // react-query mutation) so this test can assert on the actual POST
    // body sent to /api/player/reservations.
    useActiveClubs: () => useActiveClubsMock(),
    useClubAvailability: () => useClubAvailabilityMock(),
    useJoinWaitlist: () => useJoinWaitlistMock(),
  };
});

// These three panels are stubbed to simple, directly-clickable affordances
// so the test can drive club -> court -> slot selection without depending
// on DataTable/CourtAvailabilityGrid internals unrelated to this feature.
vi.mock("./components/ClubListPanel", () => ({
  ClubListPanel: ({ onSelectClub }: { onSelectClub: (id: string) => void }) => (
    <button type="button" onClick={() => onSelectClub("club_1")}>
      Select club
    </button>
  ),
}));

vi.mock("./components/ClubCourtsPanel", () => ({
  ClubCourtsPanel: ({
    onSelectCourt,
  }: {
    onSelectCourt: (id: string) => void;
  }) => (
    <button type="button" onClick={() => onSelectCourt("court_1")}>
      Select court
    </button>
  ),
}));

vi.mock("./components/CourtSchedulePanel", () => ({
  CourtSchedulePanel: ({
    onSlotClick,
  }: {
    onSlotClick: (courtId: string, slot: unknown) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSlotClick("court_1", {
          start: new Date("2026-09-15T10:00:00Z"),
          end: new Date("2026-09-15T11:00:00Z"),
          status: "free",
        })
      }
    >
      Book slot
    </button>
  ),
}));

import { BrowseCourts } from "./BrowseCourts";

function makeClub(
  overrides: Partial<ClubBrowseSummary> = {},
): ClubBrowseSummary {
  return {
    id: "club_1",
    name: "Club Padel Norte",
    email: "club@example.com",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    plan: "BASIC",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "owner-1",
    updatedBy: "owner-1",
    courtCount: 1,
    hasAvailabilityToday: true,
    availablePaymentMethods: ["MERCADOPAGO", "TRANSFER"],
    bankTransferInfo: {
      bankName: "Banco Test",
      cbu: "0000000000000000000000",
      alias: "club.test.alias",
      whatsappNumber: "+5491100000000",
    },
    ...overrides,
  };
}

function makeCourt(overrides: Partial<RawCourt> = {}) {
  return {
    id: "court_1",
    name: "Court 1",
    reservationFee: 1000,
    slots: [],
    ...overrides,
  };
}

function renderBrowseCourts() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {/* club/court are preselected via the URL (like a real shared
          `?club=X&court=Y` link) rather than driven through the stubbed
          ClubListPanel/ClubCourtsPanel — this keeps the test focused on the
          BookingConfirmDialog payment-method wiring rather than nuqs's own
          multi-key update batching. */}
      <NuqsTestingAdapter searchParams="?club=club_1&court=court_1">
        <BrowseCourts />
      </NuqsTestingAdapter>
    </QueryClientProvider>,
  );
}

describe("BrowseCourts — bank transfer payment method selection", () => {
  beforeEach(() => {
    useActiveClubsMock.mockReturnValue({
      data: [makeClub()],
      isLoading: false,
      isError: false,
    });
    useClubAvailabilityMock.mockReturnValue({
      data: [makeCourt()],
      isLoading: false,
      isUpdating: false,
      isError: false,
      rowCount: 1,
    });
    useJoinWaitlistMock.mockReturnValue({ mutate: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    toastMock.success.mockClear();
    toastMock.error.mockClear();
    fireSuccessCelebrationMock.mockClear();
  });

  it("sends paymentMethod: TRANSFER, shows a pending-hold toast, and keeps the dialog open with bank details visible instead of falsely confirming", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reservation: { id: "res_1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderBrowseCourts();

    fireEvent.click(screen.getByText("Book slot"));

    expect(
      await screen.findByRole("heading", { name: "Confirm reservation" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /bank transfer/i }));

    // Club's transfer details should now be visible in the dialog.
    expect(screen.getByText("Banco Test")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/player/reservations");
    const body = JSON.parse(init.body as string);
    expect(body.paymentMethod).toBe("TRANSFER");

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith(
        "Slot held for 60 minutes — send your transfer and message the club.",
      ),
    );
    // This is an unpaid 60-minute hold, not an actual confirmation — the
    // free/instant "Reservation confirmed." copy and celebration must never
    // fire for this path.
    expect(toastMock.success).not.toHaveBeenCalledWith(
      "Reservation confirmed.",
    );
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(fireSuccessCelebrationMock).not.toHaveBeenCalled();

    // The dialog must stay open — closing it here would permanently lose the
    // bank details/WhatsApp number the player still needs.
    expect(
      screen.getByRole("heading", { name: "Confirm reservation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Banco Test")).toBeInTheDocument();

    // The footer swaps to a dismiss-only "Got it" action; the old confirm
    // button is gone.
    expect(screen.getByRole("button", { name: /got it/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm booking/i }),
    ).not.toBeInTheDocument();
  });

  it("redirects to Mercado Pago checkout (unaffected by the TRANSFER pending-hold change) when the response includes a checkoutUrl", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reservation: { id: "res_1" },
        checkoutUrl: "https://mp.example.com/checkout/abc",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderBrowseCourts();

    fireEvent.click(screen.getByText("Book slot"));

    expect(
      await screen.findByRole("heading", { name: "Confirm reservation" }),
    ).toBeInTheDocument();

    // MERCADOPAGO is already selected by default (first in the test club's
    // availablePaymentMethods).
    fireEvent.click(
      screen.getByRole("button", { name: /continue to payment/i }),
    );

    await waitFor(() =>
      expect(window.location.href).toBe("https://mp.example.com/checkout/abc"),
    );
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(fireSuccessCelebrationMock).not.toHaveBeenCalled();
  });

  it("still shows the confirmed toast and closes the dialog for a free court, even when TRANSFER is the club's first available method", async () => {
    useActiveClubsMock.mockReturnValue({
      data: [
        makeClub({ availablePaymentMethods: ["TRANSFER", "MERCADOPAGO"] }),
      ],
      isLoading: false,
      isError: false,
    });
    useClubAvailabilityMock.mockReturnValue({
      data: [makeCourt({ reservationFee: 0 })],
      isLoading: false,
      isUpdating: false,
      isError: false,
      rowCount: 1,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reservation: { id: "res_free" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderBrowseCourts();

    fireEvent.click(screen.getByText("Book slot"));

    expect(
      await screen.findByRole("heading", { name: "Confirm reservation" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /book court/i }));

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Reservation confirmed."),
    );
    expect(toastMock.error).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Confirm reservation" }),
      ).not.toBeInTheDocument(),
    );
  });
});
