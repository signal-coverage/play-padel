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

// jsdom doesn't implement ResizeObserver, but Radix-backed components rely
// on it internally — same stub ClubSettingsView.test.tsx/CourtsView.test.tsx
// already use.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderNotificationsBell(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <NotificationsBell />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

describe("NotificationsBell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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

  it("shows the unread indicator dot when unreadCount > 0", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ notifications: [], unreadCount: 3 }));
    renderNotificationsBell(fetchMock);

    await waitFor(() =>
      expect(
        screen.getByTestId("notifications-unread-indicator"),
      ).toBeInTheDocument(),
    );
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
});
