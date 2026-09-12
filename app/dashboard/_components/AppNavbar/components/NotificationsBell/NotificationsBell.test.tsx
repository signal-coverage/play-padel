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
import { NotificationsBell } from "./NotificationsBell";
import { notificationsQueryKey } from "./hooks";

const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));
vi.mock("sonner", () => ({ toast: toastMock }));

const { refetchProfileMock } = vi.hoisted(() => ({
  refetchProfileMock: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ refetchProfile: refetchProfileMock }),
}));

// Same mocking shape as SuccessCelebrationPortal.test.tsx/CourtsView.test.tsx
// — the real module is a plain event dispatch, these tests just need to
// assert whether (and when) it fired.
const { fireSuccessCelebrationMock } = vi.hoisted(() => ({
  fireSuccessCelebrationMock: vi.fn(),
}));
vi.mock("@/lib/utils/celebration", () => ({
  fireSuccessCelebration: fireSuccessCelebrationMock,
}));

const { useReducedMotionMock } = vi.hoisted(() => ({
  useReducedMotionMock: vi.fn(() => false as boolean | null),
}));
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: useReducedMotionMock };
});

// Same key AppNavbar/consts.ts and ClubOperationalGate/consts.ts each keep
// their own copy of (see either's own comment) — this test only cares that
// useNotifications invalidates the right key by VALUE, so a third local
// copy here is exactly the same convention, not a new one.
const CLUB_OPERATIONAL_STATUS_QUERY_KEY = [
  "clubs",
  "mercadopago",
  "operational-status",
] as const;

// Same key AdminApprovalsView/consts.ts keeps its own copy of — this test
// only cares that useNotifications invalidates the right key by VALUE.
const PENDING_CLUBS_QUERY_KEY = ["admin", "clubs", "pending"] as const;

// Same key PlanSelectionModal/consts.ts keeps its own copy of — this test
// only cares that useNotifications invalidates the right key by VALUE.
const MEMBERSHIP_SUBSCRIPTION_QUERY_KEY = ["clubs", "membership"] as const;

// Same key MyReservations/consts.ts keeps its own copy of.
const MY_RESERVATIONS_BASE_KEY = ["player", "my-reservations"] as const;

// Same keys ReservationsView/hooks.ts uses directly (not exported consts
// there, just inline literals — matched by value here too).
const RESERVATIONS_QUERY_KEY = ["reservations"] as const;
const COURT_SLOTS_QUERY_KEY = ["court-slots"] as const;

// Same key BrowseCourts/consts.ts keeps its own copy of.
const PLAYER_CLUB_AVAILABILITY_BASE_KEY = [
  "player",
  "club-availability",
] as const;

// Same key ClubSettingsView/hooks.ts keeps its own copy of (the owner's own,
// non-admin "current club" query).
const CLUB_CURRENT_QUERY_KEY = ["clubs", "current"] as const;

// jsdom doesn't implement ResizeObserver, but Radix-backed components rely
// on it internally — same stub ClubSettingsView.test.tsx/CourtsView.test.tsx
// already use.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom doesn't implement EventSource either. This mock is deliberately
// thin — just enough to (a) let useNotificationStream construct and tear
// one down without throwing, and (b) let a test dispatch a fake
// server-pushed "notification" event via the last-constructed instance's
// own `emit`, mirroring how the real server-sent event arrives.
class MockEventSource {
  static instances: MockEventSource[] = [];
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();
  closed = false;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function renderNotificationsBell(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("EventSource", MockEventSource);
  MockEventSource.instances = [];

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <NotificationsBell />
    </QueryClientProvider>,
  );

  return { queryClient };
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

// Shared by the newer "invalidates X on a fresh notification of type Y"
// tests below — same two-poll-ticks shape every existing test in this file
// already hand-rolls, factored out once there were enough near-identical
// copies to be worth it. Returns the invalidateQueries spy already primed
// past the baseline (first) poll, ready for a caller to trigger the second
// tick and assert on.
async function renderAndAwaitBaseline(
  type: string,
  extra: Record<string, unknown> = {},
) {
  let call = 0;
  const fetchMock = vi.fn((url: string) => {
    if (url === "/api/notifications") {
      call += 1;
      const notifications =
        call === 1
          ? []
          : [
              {
                id: "n1",
                clubId: null,
                type,
                recipientId: "user_1",
                recipientEmail: "user@example.com",
                title: "Notification",
                message: "<p>irrelevant html</p>",
                status: "SENT",
                createdAt: new Date().toISOString(),
                ...extra,
              },
            ];
      return Promise.resolve(
        jsonResponse({ notifications, unreadCount: notifications.length }),
      );
    }
    return Promise.resolve({ ok: false, json: async () => ({}) });
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("EventSource", MockEventSource);
  MockEventSource.instances = [];

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>
      <NotificationsBell />
    </QueryClientProvider>,
  );

  await screen.findByRole("button", { name: "Notifications" });
  await waitFor(() => expect(call).toBe(1));

  return { queryClient, invalidateSpy };
}

describe("NotificationsBell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.warning.mockReset();
    toastMock.info.mockReset();
    refetchProfileMock.mockReset();
    fireSuccessCelebrationMock.mockReset();
    useReducedMotionMock.mockReturnValue(false);
  });

  it("renders the notifications bell button, no longer disabled", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ notifications: [], unreadCount: 0 }));
    renderNotificationsBell(fetchMock);

    const button = await screen.findByRole("button", {
      name: "Notifications",
    });
    expect(button).not.toBeDisabled();
  });

  it("shows the unread indicator as a small red tennis ball (not a plain dot) when unreadCount > 0", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ notifications: [], unreadCount: 3 }));
    renderNotificationsBell(fetchMock);

    // The app's status/severity icon language is always the tennis ball
    // (see e.g. AdminApprovalsView/AdminClubList's own warning badges) — a
    // plain static/perpetually-still dot barely registered, per the whole
    // reason this changed.
    await waitFor(() => {
      const indicator = screen.getByTestId("notifications-unread-indicator");
      expect(indicator).toBeInTheDocument();
      const svg = indicator.querySelector("svg");
      expect(svg).not.toBeNull();
      // Bottom-left of the bell button, and big enough to actually stand
      // out — the original top-right/size-10 placement was too subtle.
      expect(indicator.className).toContain("-bottom-1");
      expect(indicator.className).toContain("-left-1");
      expect(indicator.className).not.toContain("-top-1");
      expect(indicator.className).not.toContain("-right-1");
      expect(svg).toHaveAttribute("width", "16");
      expect(svg).toHaveAttribute("height", "16");
    });
  });

  it("replays the unread indicator's bounce animation once when the bell button is hovered", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ notifications: [], unreadCount: 3 }));
    renderNotificationsBell(fetchMock);

    const initialIndicator = await screen.findByTestId(
      "notifications-unread-indicator",
    );
    const initialBounceCount =
      initialIndicator.getAttribute("data-bounce-count");

    const button = screen.getByRole("button", { name: "Notifications" });
    fireEvent.mouseEnter(button);

    // A hover-triggered replay remounts the indicator (see
    // NotificationsBell.tsx's bounceCount-as-key trick) rather than
    // tweaking a still-mounted node's style, so re-querying is what
    // proves a NEW play actually happened, not just a lingering one.
    await waitFor(() => {
      const updatedIndicator = screen.getByTestId(
        "notifications-unread-indicator",
      );
      expect(updatedIndicator.getAttribute("data-bounce-count")).not.toBe(
        initialBounceCount,
      );
    });
  });

  it("hides the unread indicator dot when unreadCount is 0", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ notifications: [], unreadCount: 0 }));
    renderNotificationsBell(fetchMock);

    await screen.findByRole("button", { name: "Notifications" });
    expect(
      screen.queryByTestId("notifications-unread-indicator"),
    ).not.toBeInTheDocument();
  });

  it("shows each notification's title when the popover opens", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        notifications: [
          {
            id: "1",
            clubId: null,
            type: "RESERVATION_REMINDER",
            recipientId: "u1",
            recipientEmail: "a@b.com",
            title: "Your reservation is tomorrow",
            message: "<p>irrelevant html</p>",
            status: "SENT",
            createdAt: new Date().toISOString(),
          },
          {
            id: "2",
            clubId: null,
            type: "PAYMENT_CONFIRMED",
            recipientId: "u1",
            recipientEmail: "a@b.com",
            title: "Payment confirmed",
            message: "<p>irrelevant html</p>",
            status: "SENT",
            readAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
      }),
    );
    renderNotificationsBell(fetchMock);

    const button = await screen.findByRole("button", {
      name: "Notifications",
    });
    fireEvent.click(button);

    expect(
      await screen.findByText("Your reservation is tomorrow"),
    ).toBeInTheDocument();
    expect(screen.getByText("Payment confirmed")).toBeInTheDocument();
  });

  it("pairs hover:bg-accent with hover:text-accent-foreground, so hovered text stays legible in both themes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        notifications: [
          {
            id: "1",
            clubId: null,
            type: "RESERVATION_REMINDER",
            recipientId: "u1",
            recipientEmail: "a@b.com",
            title: "Your reservation is tomorrow",
            message: "<p>irrelevant html</p>",
            status: "SENT",
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
      }),
    );
    renderNotificationsBell(fetchMock);

    fireEvent.click(
      await screen.findByRole("button", { name: "Notifications" }),
    );

    // --accent and --foreground/--muted-foreground are the same or a
    // clashing color in at least one theme (see app/globals.css) — a plain
    // hover:bg-accent with no matching text color leaves hovered text
    // unreadable. The title has no color class of its own, so it only
    // needs the Link's own hover:text-accent-foreground (inherited); the
    // timestamp sets its own text-muted-foreground, which would otherwise
    // override that inherited color, so it needs the group-hover variant
    // explicitly — same "group" + "group-hover:" pairing already used in
    // UpcomingListItems.tsx, and the same hover:bg-accent
    // hover:text-accent-foreground pairing NavGroupMenu's own menu items
    // already use.
    const link = screen.getByRole("link", {
      name: /your reservation is tomorrow/i,
    });
    expect(link.className).toMatch(/\bgroup\b/);
    expect(link.className).toMatch(/\bhover:bg-accent\b/);
    expect(link.className).toMatch(/\bhover:text-accent-foreground\b/);

    const timestamp = screen.getByText(/ago$/i);
    expect(timestamp.className).toMatch(
      /\bgroup-hover:text-accent-foreground\b/,
    );
  });

  it("renders each notification as a link to where it corresponds, based on its type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        notifications: [
          {
            id: "1",
            clubId: null,
            type: "RESERVATION_REMINDER",
            recipientId: "u1",
            recipientEmail: "a@b.com",
            title: "Your reservation is tomorrow",
            message: "<p>irrelevant html</p>",
            status: "SENT",
            createdAt: new Date().toISOString(),
          },
          {
            id: "2",
            clubId: "club_1",
            type: "CLUB_APPROVED",
            recipientId: "owner_1",
            recipientEmail: "owner@b.com",
            title: "Your club has been approved",
            message: "<p>irrelevant html</p>",
            status: "SENT",
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 2,
      }),
    );
    renderNotificationsBell(fetchMock);

    fireEvent.click(
      await screen.findByRole("button", { name: "Notifications" }),
    );

    expect(
      await screen.findByRole("link", {
        name: /your reservation is tomorrow/i,
      }),
    ).toHaveAttribute("href", "/dashboard/my-reservations");
    // ?clubId= pre-selects the right club for an owner-who's-also-admin,
    // who'd otherwise land on AdminClubSettingsView's bare picker instead
    // of their own club's settings (see getNotificationHref's own comment).
    expect(
      screen.getByRole("link", { name: /your club has been approved/i }),
    ).toHaveAttribute("href", "/dashboard/settings/club?clubId=club_1");
  });

  it("closes the popover when a notification is clicked", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        notifications: [
          {
            id: "1",
            clubId: null,
            type: "RESERVATION_REMINDER",
            recipientId: "u1",
            recipientEmail: "a@b.com",
            title: "Your reservation is tomorrow",
            message: "<p>irrelevant html</p>",
            status: "SENT",
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
      }),
    );
    renderNotificationsBell(fetchMock);

    fireEvent.click(
      await screen.findByRole("button", { name: "Notifications" }),
    );
    const link = await screen.findByRole("link", {
      name: /your reservation is tomorrow/i,
    });
    fireEvent.click(link);

    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: /your reservation is tomorrow/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("marks an unread notification as read (PATCH /api/notifications/[id]/read) when it's clicked", async () => {
    const readCalls: string[] = [];
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/notifications/1/read") {
        readCalls.push(url);
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(
        jsonResponse({
          notifications: [
            {
              id: "1",
              clubId: null,
              type: "RESERVATION_REMINDER",
              recipientId: "u1",
              recipientEmail: "a@b.com",
              title: "Your reservation is tomorrow",
              message: "<p>irrelevant html</p>",
              status: "SENT",
              createdAt: new Date().toISOString(),
            },
          ],
          unreadCount: 1,
        }),
      );
    });
    renderNotificationsBell(fetchMock);

    fireEvent.click(
      await screen.findByRole("button", { name: "Notifications" }),
    );
    const link = await screen.findByRole("link", {
      name: /your reservation is tomorrow/i,
    });
    fireEvent.click(link);

    await waitFor(() =>
      expect(readCalls).toEqual(["/api/notifications/1/read"]),
    );
  });

  it("does not call the mark-as-read endpoint for a notification that's already read", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.endsWith("/read")) {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(
        jsonResponse({
          notifications: [
            {
              id: "1",
              clubId: null,
              type: "PAYMENT_CONFIRMED",
              recipientId: "u1",
              recipientEmail: "a@b.com",
              title: "Payment confirmed",
              message: "<p>irrelevant html</p>",
              status: "SENT",
              readAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
          ],
          unreadCount: 0,
        }),
      );
    });
    renderNotificationsBell(fetchMock);

    fireEvent.click(
      await screen.findByRole("button", { name: "Notifications" }),
    );
    const link = await screen.findByRole("link", {
      name: /payment confirmed/i,
    });
    fireEvent.click(link);

    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: /payment confirmed/i }),
      ).not.toBeInTheDocument(),
    );
    expect(
      fetchMock.mock.calls.some(([url]) =>
        typeof url === "string" ? url.endsWith("/read") : false,
      ),
    ).toBe(false);
  });

  it("shows an empty state when there are no notifications", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ notifications: [], unreadCount: 0 }));
    renderNotificationsBell(fetchMock);

    const button = await screen.findByRole("button", {
      name: "Notifications",
    });
    fireEvent.click(button);

    expect(await screen.findByText("No notifications yet")).toBeInTheDocument();
  });

  it("calls PATCH /api/notifications/read-all when Mark all as read is clicked", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/notifications/read-all") {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(
        jsonResponse({
          notifications: [
            {
              id: "1",
              clubId: null,
              type: "RESERVATION_REMINDER",
              recipientId: "u1",
              recipientEmail: "a@b.com",
              title: "Your reservation is tomorrow",
              message: "<p>irrelevant html</p>",
              status: "SENT",
              createdAt: new Date().toISOString(),
            },
          ],
          unreadCount: 1,
        }),
      );
    });
    renderNotificationsBell(fetchMock);

    const button = await screen.findByRole("button", {
      name: "Notifications",
    });
    fireEvent.click(button);
    const markAllButton = await screen.findByRole("button", {
      name: "Mark all as read",
    });
    fireEvent.click(markAllButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/notifications/read-all",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });

  it("clears the unread indicator immediately (optimistically), without waiting for the PATCH to resolve", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/notifications/read-all") {
        // Never resolves — proves the indicator clears without waiting on
        // this request at all.
        return new Promise(() => {});
      }
      return Promise.resolve(
        jsonResponse({
          notifications: [
            {
              id: "1",
              clubId: null,
              type: "RESERVATION_REMINDER",
              recipientId: "u1",
              recipientEmail: "a@b.com",
              title: "Your reservation is tomorrow",
              message: "<p>irrelevant html</p>",
              status: "SENT",
              createdAt: new Date().toISOString(),
            },
          ],
          unreadCount: 1,
        }),
      );
    });
    renderNotificationsBell(fetchMock);

    await waitFor(() =>
      expect(
        screen.getByTestId("notifications-unread-indicator"),
      ).toBeInTheDocument(),
    );

    const button = screen.getByRole("button", { name: "Notifications" });
    fireEvent.click(button);
    const markAllButton = await screen.findByRole("button", {
      name: "Mark all as read",
    });
    fireEvent.click(markAllButton);

    await waitFor(() =>
      expect(
        screen.queryByTestId("notifications-unread-indicator"),
      ).not.toBeInTheDocument(),
    );
  });

  it("rolls back the optimistic read-all update if the PATCH request fails", async () => {
    let rejectPatch: (() => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/notifications/read-all") {
        return new Promise((_resolve, reject) => {
          rejectPatch = () => reject(new Error("Something went wrong"));
        });
      }
      return Promise.resolve(
        jsonResponse({
          notifications: [
            {
              id: "1",
              clubId: null,
              type: "RESERVATION_REMINDER",
              recipientId: "u1",
              recipientEmail: "a@b.com",
              title: "Your reservation is tomorrow",
              message: "<p>irrelevant html</p>",
              status: "SENT",
              createdAt: new Date().toISOString(),
            },
          ],
          unreadCount: 1,
        }),
      );
    });
    renderNotificationsBell(fetchMock);

    await waitFor(() =>
      expect(
        screen.getByTestId("notifications-unread-indicator"),
      ).toBeInTheDocument(),
    );

    const button = screen.getByRole("button", { name: "Notifications" });
    fireEvent.click(button);
    const markAllButton = await screen.findByRole("button", {
      name: "Mark all as read",
    });
    fireEvent.click(markAllButton);

    // Cleared optimistically first, before the PATCH even resolves...
    await waitFor(() =>
      expect(
        screen.queryByTestId("notifications-unread-indicator"),
      ).not.toBeInTheDocument(),
    );

    // ...then restored once the PATCH is confirmed to have failed.
    rejectPatch?.();
    await waitFor(() =>
      expect(
        screen.getByTestId("notifications-unread-indicator"),
      ).toBeInTheDocument(),
    );
  });

  it("invalidates the club operational-status query when a genuinely NEW notification arrives, so gates like ClubOperationalGate refresh without a manual reload", async () => {
    let call = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/notifications") {
        call += 1;
        // First poll: nothing yet, just the baseline. Second poll: one
        // brand-new notification — exactly the "club got approved" case
        // reported.
        const notifications =
          call === 1
            ? []
            : [
                {
                  id: "n1",
                  clubId: "club_1",
                  type: "CLUB_APPROVED",
                  recipientId: "owner_1",
                  recipientEmail: "owner@example.com",
                  title: "Your club has been approved",
                  message: "<p>irrelevant html</p>",
                  status: "SENT",
                  createdAt: new Date().toISOString(),
                },
              ];
        return Promise.resolve(
          jsonResponse({ notifications, unreadCount: notifications.length }),
        );
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsBell />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Notifications" });
    // Wait for the FIRST fetch to actually resolve and get processed (its
    // own effect run establishes the "nothing new yet" baseline) before
    // triggering a second one — otherwise the manual refetchQueries below
    // could race the initial one instead of landing as a genuinely
    // separate poll tick.
    await waitFor(() => expect(call).toBe(1));
    // The FIRST fetch establishes the baseline (nothing was "seen" before
    // this component mounted) — it must not itself be treated as a batch
    // of brand-new arrivals, or every page load would spuriously
    // invalidate this.
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: CLUB_OPERATIONAL_STATUS_QUERY_KEY,
      }),
    );

    // Simulates the next poll tick landing with new data, without waiting
    // out the real 30s refetchInterval.
    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: CLUB_OPERATIONAL_STATUS_QUERY_KEY,
        }),
      );
    });
  });

  // The real bug reported live: activating the FREE plan via the admin CLI
  // never showed up on the owner's already-open dashboard until they
  // manually reloaded — PaymentActivationScreen/PlanSelectionModal read this
  // exact query (see PlanSelectionModal/hooks.ts's useMembershipSubscription),
  // which CLUB_OPERATIONAL_STATUS_QUERY_KEY's own invalidation above doesn't
  // touch.
  it("invalidates the membership-subscription query when a genuinely NEW notification arrives, so the membership screens refresh without a manual reload", async () => {
    let call = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/notifications") {
        call += 1;
        const notifications =
          call === 1
            ? []
            : [
                {
                  id: "n1",
                  clubId: "club_1",
                  type: "CLUB_OPERATIONAL_READY",
                  recipientId: "owner_1",
                  recipientEmail: "owner@example.com",
                  title: "Your dashboard is unlocked",
                  message: "<p>irrelevant html</p>",
                  status: "SENT",
                  createdAt: new Date().toISOString(),
                },
              ];
        return Promise.resolve(
          jsonResponse({ notifications, unreadCount: notifications.length }),
        );
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsBell />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() => expect(call).toBe(1));
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: MEMBERSHIP_SUBSCRIPTION_QUERY_KEY,
      }),
    );

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: MEMBERSHIP_SUBSCRIPTION_QUERY_KEY,
        }),
      );
    });
  });

  it("invalidates the admin pending-clubs queue when a genuinely NEW CLUB_PENDING_APPROVAL notification arrives, so AdminApprovalsView refreshes without a manual reload", async () => {
    let call = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/notifications") {
        call += 1;
        const notifications =
          call === 1
            ? []
            : [
                {
                  id: "n1",
                  clubId: "club_2",
                  type: "CLUB_PENDING_APPROVAL",
                  recipientId: "admin_1",
                  recipientEmail: "admin@example.com",
                  title: "A new club is awaiting approval",
                  message: "<p>irrelevant html</p>",
                  status: "SENT",
                  createdAt: new Date().toISOString(),
                },
              ];
        return Promise.resolve(
          jsonResponse({ notifications, unreadCount: notifications.length }),
        );
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsBell />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() => expect(call).toBe(1));
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: PENDING_CLUBS_QUERY_KEY }),
    );

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: PENDING_CLUBS_QUERY_KEY }),
      );
    });
  });

  it("does NOT invalidate the admin pending-clubs queue for an unrelated new notification type", async () => {
    let call = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/notifications") {
        call += 1;
        const notifications =
          call === 1
            ? []
            : [
                {
                  id: "n1",
                  clubId: null,
                  type: "RESERVATION_REMINDER",
                  recipientId: "user_1",
                  recipientEmail: "user@example.com",
                  title: "Your reservation is tomorrow",
                  message: "<p>irrelevant html</p>",
                  status: "SENT",
                  createdAt: new Date().toISOString(),
                },
              ];
        return Promise.resolve(
          jsonResponse({ notifications, unreadCount: notifications.length }),
        );
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsBell />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() => expect(call).toBe(1));

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    // Give the effect a tick to run, then confirm it never touched the
    // admin queue (it DOES still invalidate the shared notificationsQueryKey
    // itself via other paths — only PENDING_CLUBS_QUERY_KEY is asserted).
    await waitFor(() => expect(call).toBe(2));
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: PENDING_CLUBS_QUERY_KEY }),
    );
  });

  it("refetches the viewer's own profile when a genuinely NEW ADMIN_ACCESS_GRANTED notification arrives, so the Admin nav group appears without a manual reload", async () => {
    let call = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/notifications") {
        call += 1;
        const notifications =
          call === 1
            ? []
            : [
                {
                  id: "n1",
                  clubId: null,
                  type: "ADMIN_ACCESS_GRANTED",
                  recipientId: "user_1",
                  recipientEmail: "user@example.com",
                  title: "You now have admin access on Play Padel",
                  message: "<p>irrelevant html</p>",
                  status: "SENT",
                  createdAt: new Date().toISOString(),
                },
              ];
        return Promise.resolve(
          jsonResponse({ notifications, unreadCount: notifications.length }),
        );
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsBell />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() => expect(call).toBe(1));
    expect(refetchProfileMock).not.toHaveBeenCalled();

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => expect(refetchProfileMock).toHaveBeenCalled());
  });

  it("does NOT refetch the profile for an unrelated new notification type", async () => {
    let call = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/notifications") {
        call += 1;
        const notifications =
          call === 1
            ? []
            : [
                {
                  id: "n1",
                  clubId: null,
                  type: "RESERVATION_REMINDER",
                  recipientId: "user_1",
                  recipientEmail: "user@example.com",
                  title: "Your reservation is tomorrow",
                  message: "<p>irrelevant html</p>",
                  status: "SENT",
                  createdAt: new Date().toISOString(),
                },
              ];
        return Promise.resolve(
          jsonResponse({ notifications, unreadCount: notifications.length }),
        );
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsBell />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() => expect(call).toBe(1));

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => expect(call).toBe(2));
    expect(refetchProfileMock).not.toHaveBeenCalled();
  });

  it("refetches the viewer's own profile when a genuinely NEW ADMIN_ACCESS_REVOKED notification arrives, so the Admin nav group disappears without a manual reload", async () => {
    let call = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/notifications") {
        call += 1;
        const notifications =
          call === 1
            ? []
            : [
                {
                  id: "n1",
                  clubId: null,
                  type: "ADMIN_ACCESS_REVOKED",
                  recipientId: "user_1",
                  recipientEmail: "user@example.com",
                  title: "Your admin access on Play Padel was revoked",
                  message: "<p>irrelevant html</p>",
                  status: "SENT",
                  createdAt: new Date().toISOString(),
                },
              ];
        return Promise.resolve(
          jsonResponse({ notifications, unreadCount: notifications.length }),
        );
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsBell />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() => expect(call).toBe(1));
    expect(refetchProfileMock).not.toHaveBeenCalled();

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => expect(refetchProfileMock).toHaveBeenCalled());
  });

  it("plays the big tennis-ball celebration when a genuinely NEW ADMIN_ACCESS_GRANTED notification arrives", async () => {
    let call = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/notifications") {
        call += 1;
        const notifications =
          call === 1
            ? []
            : [
                {
                  id: "n1",
                  clubId: null,
                  type: "ADMIN_ACCESS_GRANTED",
                  recipientId: "user_1",
                  recipientEmail: "user@example.com",
                  title: "You now have admin access on Play Padel",
                  message: "<p>irrelevant html</p>",
                  status: "SENT",
                  createdAt: new Date().toISOString(),
                },
              ];
        return Promise.resolve(
          jsonResponse({ notifications, unreadCount: notifications.length }),
        );
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsBell />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() => expect(call).toBe(1));
    expect(fireSuccessCelebrationMock).not.toHaveBeenCalled();

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() =>
      expect(fireSuccessCelebrationMock).toHaveBeenCalledTimes(1),
    );
  });

  it("does NOT play the celebration for an ADMIN_ACCESS_REVOKED arrival, or any other notification type", async () => {
    let call = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/notifications") {
        call += 1;
        const notifications =
          call === 1
            ? []
            : [
                {
                  id: "n1",
                  clubId: null,
                  type: "ADMIN_ACCESS_REVOKED",
                  recipientId: "user_1",
                  recipientEmail: "user@example.com",
                  title: "Your admin access on Play Padel was revoked",
                  message: "<p>irrelevant html</p>",
                  status: "SENT",
                  createdAt: new Date().toISOString(),
                },
              ];
        return Promise.resolve(
          jsonResponse({ notifications, unreadCount: notifications.length }),
        );
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsBell />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() => expect(call).toBe(1));

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => expect(refetchProfileMock).toHaveBeenCalled());
    expect(fireSuccessCelebrationMock).not.toHaveBeenCalled();
  });

  it("skips the celebration for a fresh ADMIN_ACCESS_GRANTED arrival when the viewer prefers reduced motion", async () => {
    useReducedMotionMock.mockReturnValue(true);
    let call = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/notifications") {
        call += 1;
        const notifications =
          call === 1
            ? []
            : [
                {
                  id: "n1",
                  clubId: null,
                  type: "ADMIN_ACCESS_GRANTED",
                  recipientId: "user_1",
                  recipientEmail: "user@example.com",
                  title: "You now have admin access on Play Padel",
                  message: "<p>irrelevant html</p>",
                  status: "SENT",
                  createdAt: new Date().toISOString(),
                },
              ];
        return Promise.resolve(
          jsonResponse({ notifications, unreadCount: notifications.length }),
        );
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsBell />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() => expect(call).toBe(1));

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => expect(refetchProfileMock).toHaveBeenCalled());
    expect(fireSuccessCelebrationMock).not.toHaveBeenCalled();
  });

  it("shows an immediate toast (matching the notification's own outcome) and refreshes the list the instant the SSE stream pushes a new notification, instead of waiting on the 30s poll", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ notifications: [], unreadCount: 0 }));
    renderNotificationsBell(fetchMock);

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() =>
      expect(MockEventSource.instances.length).toBeGreaterThan(0),
    );
    const initialFetchCount = fetchMock.mock.calls.filter(
      ([url]) => url === "/api/notifications",
    ).length;

    const source = MockEventSource.instances[0];
    source.emit("notification", {
      id: "n1",
      clubId: "club_1",
      type: "CLUB_APPROVED",
      recipientId: "owner_1",
      recipientEmail: "owner@example.com",
      title: "Your club has been approved",
      message: "<p>irrelevant html</p>",
      status: "SENT",
      createdAt: new Date().toISOString(),
    });

    // CLUB_APPROVED is unambiguous good news (see
    // getNotificationToastVariant) — the toast the user actually sees, not
    // a generic "you have a new notification".
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith(
        "Your club has been approved",
      ),
    );

    // The list/unread-count catch up too — via the same
    // notificationsQueryKey invalidate-then-refetch path useNotifications
    // already covers on its own (see the club-operational-status test
    // above), not a second, separately-maintained cache update.
    await waitFor(() => {
      const fetchCount = fetchMock.mock.calls.filter(
        ([url]) => url === "/api/notifications",
      ).length;
      expect(fetchCount).toBeGreaterThan(initialFetchCount);
    });
  });

  it("closes the SSE connection when the component unmounts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ notifications: [], unreadCount: 0 }));
    renderNotificationsBell(fetchMock);

    await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() =>
      expect(MockEventSource.instances.length).toBeGreaterThan(0),
    );
    const source = MockEventSource.instances[0];
    expect(source.closed).toBe(false);

    cleanup();

    expect(source.closed).toBe(true);
  });

  // The real gap reported: the bell/toast fired for these, but the actual
  // screen a player would be looking at (My Reservations) never refreshed
  // on its own.
  it.each([
    "RESERVATION_CANCELLED",
    "PAYMENT_CONFIRMED",
    "RESERVATION_UPDATED",
  ])(
    "invalidates My Reservations when a fresh %s notification arrives",
    async (type) => {
      const { queryClient, invalidateSpy } = await renderAndAwaitBaseline(type);

      await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: MY_RESERVATIONS_BASE_KEY }),
        );
      });
    },
  );

  it("invalidates the owner's Reservations table when a fresh RESERVATION_PAYMENT_CONFLICT notification arrives", async () => {
    const { queryClient, invalidateSpy } = await renderAndAwaitBaseline(
      "RESERVATION_PAYMENT_CONFLICT",
    );

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: RESERVATIONS_QUERY_KEY }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: COURT_SLOTS_QUERY_KEY }),
      );
    });
  });

  it("invalidates Browse Courts' availability when a fresh WAITLIST_SLOT_AVAILABLE notification arrives", async () => {
    const { queryClient, invalidateSpy } = await renderAndAwaitBaseline(
      "WAITLIST_SLOT_AVAILABLE",
    );

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: PLAYER_CLUB_AVAILABILITY_BASE_KEY,
        }),
      );
    });
  });

  it("refetches the viewer's own profile when a fresh PROFILE_UPDATED_BY_ADMIN notification arrives, so an admin-edited field (category, hand, contact info) shows up live", async () => {
    const { queryClient } = await renderAndAwaitBaseline(
      "PROFILE_UPDATED_BY_ADMIN",
    );
    expect(refetchProfileMock).not.toHaveBeenCalled();

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => expect(refetchProfileMock).toHaveBeenCalled());
  });

  it("invalidates the owner's own club-settings query when a fresh CLUB_UPDATED_BY_ADMIN notification arrives", async () => {
    const { queryClient, invalidateSpy } = await renderAndAwaitBaseline(
      "CLUB_UPDATED_BY_ADMIN",
    );

    await queryClient.refetchQueries({ queryKey: notificationsQueryKey });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: CLUB_CURRENT_QUERY_KEY }),
      );
    });
  });
});
