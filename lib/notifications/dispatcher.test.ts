import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  createNotificationMock,
  updateNotificationStatusMock,
  sendMock,
  listAdminRecipientsMock,
  getUserProfileMock,
} = vi.hoisted(() => ({
  createNotificationMock: vi.fn(),
  updateNotificationStatusMock: vi.fn(),
  sendMock: vi.fn(),
  listAdminRecipientsMock: vi.fn(),
  getUserProfileMock: vi.fn(),
}));

vi.mock("@/core/notifications/services/notifications.service", () => ({
  createNotification: createNotificationMock,
  updateNotificationStatus: updateNotificationStatusMock,
  listAdminRecipients: listAdminRecipientsMock,
}));

vi.mock("@/core/users/services/users.service", () => ({
  getUserProfile: getUserProfileMock,
}));

vi.mock("@/lib/email/resend", () => ({
  getResendClient: () => ({
    emails: { send: sendMock },
  }),
}));

import { dispatch, notifyAllAdmins } from "./dispatcher";

describe("dispatch — locale resolution", () => {
  beforeEach(() => {
    createNotificationMock.mockReset();
    updateNotificationStatusMock.mockReset();
    sendMock.mockReset();
    getUserProfileMock.mockReset();
    createNotificationMock.mockResolvedValue({
      id: "notif_1",
      clubId: null,
      type: "CLUB_APPROVED",
      recipientId: "user_1",
      recipientEmail: "user@example.com",
      title: "subj",
      message: "<p>html</p>",
      status: "PENDING",
      createdAt: new Date(),
    });
  });

  // The whole point of storing this: notifications.service.ts's
  // hydrateLiveContent re-renders title/message from these SAME raw params
  // on every later read, in whatever locale the viewer is using AT THAT
  // MOMENT — not the recipientLocale resolved here at dispatch time. If
  // this ever silently stops being forwarded, a notification would go back
  // to being frozen in whatever language it was dispatched in forever.
  it("persists the raw params alongside the resolved title/message, so the notification can be re-rendered live in a different locale later", async () => {
    getUserProfileMock.mockResolvedValue({ locale: "en" });

    await dispatch({
      type: "CLUB_APPROVED",
      clubId: "club_1",
      recipientId: "user_1",
      recipientEmail: "user@example.com",
      recipientName: "User",
      params: { clubName: "Alpha Club" },
      sendEmail: false,
    });

    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ params: { clubName: "Alpha Club" } }),
    );
  });

  it("renders content in the recipient's own English locale", async () => {
    getUserProfileMock.mockResolvedValue({ locale: "en" });

    await dispatch({
      type: "CLUB_APPROVED",
      clubId: "club_1",
      recipientId: "user_1",
      recipientEmail: "user@example.com",
      recipientName: "User",
      params: {},
      sendEmail: false,
    });

    expect(getUserProfileMock).toHaveBeenCalledWith("user_1");
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Your club has been approved",
        message: expect.stringContaining(
          "Your club is now approved and can accept reservations.",
        ),
      }),
    );
  });

  it("renders content in the recipient's own Spanish locale", async () => {
    getUserProfileMock.mockResolvedValue({ locale: "es" });

    await dispatch({
      type: "CLUB_APPROVED",
      clubId: "club_1",
      recipientId: "user_1",
      recipientEmail: "user@example.com",
      recipientName: "User",
      params: {},
      sendEmail: false,
    });

    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Tu club fue aprobado",
        message: expect.stringContaining(
          "Tu club ya está aprobado y puede aceptar reservas.",
        ),
      }),
    );
  });

  it("falls back to DEFAULT_LOCALE (es) when the recipient has no UserProfile", async () => {
    getUserProfileMock.mockResolvedValue(null);

    await dispatch({
      type: "CLUB_APPROVED",
      clubId: "club_1",
      recipientId: "user_missing",
      recipientEmail: "user@example.com",
      recipientName: "User",
      params: {},
      sendEmail: false,
    });

    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Tu club fue aprobado",
      }),
    );
  });
});

describe("dispatch — sendEmail: false (in-app-only notification)", () => {
  beforeEach(() => {
    createNotificationMock.mockReset();
    updateNotificationStatusMock.mockReset();
    sendMock.mockReset();
    getUserProfileMock.mockReset();
    getUserProfileMock.mockResolvedValue({ locale: "en" });
    createNotificationMock.mockResolvedValue({
      id: "notif_1",
      clubId: null,
      type: "SYSTEM_JOB_FAILED",
      recipientId: "user_1",
      recipientEmail: "user@example.com",
      title: "subj",
      message: "<p>html</p>",
      status: "PENDING",
      createdAt: new Date(),
    });
  });

  it("marks the row SKIPPED and never calls Resend when sendEmail is false", async () => {
    await dispatch({
      type: "SYSTEM_JOB_FAILED",
      clubId: null,
      recipientId: "user_1",
      recipientEmail: "user@example.com",
      recipientName: "User",
      params: { kind: "CRON", name: "test", errorMessage: "boom" },
      sendEmail: false,
    });

    expect(updateNotificationStatusMock).toHaveBeenCalledWith(
      "notif_1",
      "SKIPPED",
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips even when recipientEmail is missing (never reaches the no-email guard)", async () => {
    await dispatch({
      type: "SYSTEM_JOB_FAILED",
      clubId: null,
      recipientId: "user_1",
      recipientEmail: null,
      recipientName: "User",
      params: { kind: "CRON", name: "test", errorMessage: "boom" },
      sendEmail: false,
    });

    expect(updateNotificationStatusMock).toHaveBeenCalledWith(
      "notif_1",
      "SKIPPED",
    );
    expect(updateNotificationStatusMock).not.toHaveBeenCalledWith(
      "notif_1",
      "FAILED",
      expect.anything(),
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("still sends via Resend as before when sendEmail is omitted", async () => {
    const previousApiKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "test_key";
    sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });

    await dispatch({
      type: "PAYMENT_CONFIRMED",
      clubId: "club_1",
      recipientId: "user_1",
      recipientEmail: "user@example.com",
      recipientName: "User",
      params: {
        userName: "User",
        invoiceNumber: 1,
        total: 100,
        currency: "USD",
      },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(updateNotificationStatusMock).toHaveBeenCalledWith(
      "notif_1",
      "SENT",
      expect.objectContaining({ sentAt: expect.any(Date) }),
    );

    process.env.RESEND_API_KEY = previousApiKey;
  });

  it("sends from the default noreply@play-padel.com.ar address when RESEND_FROM_ADDRESS isn't set", async () => {
    const previousApiKey = process.env.RESEND_API_KEY;
    const previousFromAddress = process.env.RESEND_FROM_ADDRESS;
    process.env.RESEND_API_KEY = "test_key";
    delete process.env.RESEND_FROM_ADDRESS;
    sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });

    await dispatch({
      type: "PAYMENT_CONFIRMED",
      clubId: "club_1",
      recipientId: "user_1",
      recipientEmail: "user@example.com",
      recipientName: "User",
      params: {
        userName: "User",
        invoiceNumber: 1,
        total: 100,
        currency: "USD",
      },
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "noreply@play-padel.com.ar" }),
    );

    process.env.RESEND_API_KEY = previousApiKey;
    process.env.RESEND_FROM_ADDRESS = previousFromAddress;
  });

  it("marks the row FAILED instead of hanging forever when the Resend call never resolves", async () => {
    vi.useFakeTimers();
    const previousApiKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "test_key";
    // Simulate a network hang: a promise that never settles.
    sendMock.mockReturnValue(new Promise(() => {}));

    const dispatchPromise = dispatch({
      type: "PAYMENT_CONFIRMED",
      clubId: "club_1",
      recipientId: "user_1",
      recipientEmail: "user@example.com",
      recipientName: "User",
      params: {
        userName: "User",
        invoiceNumber: 1,
        total: 100,
        currency: "USD",
      },
    });

    // Advance past the internal send timeout so the hang resolves into a
    // caught, fast failure instead of actually hanging this test.
    await vi.advanceTimersByTimeAsync(30_000);
    await dispatchPromise;

    expect(updateNotificationStatusMock).toHaveBeenCalledWith(
      "notif_1",
      "FAILED",
      expect.objectContaining({
        failureReason: expect.stringMatching(/timed out/i),
      }),
    );

    process.env.RESEND_API_KEY = previousApiKey;
    vi.useRealTimers();
  }, 10_000);

  // Read live from process.env on every dispatch (not cached at module load,
  // same convention this file already uses for RESEND_API_KEY) so a
  // per-environment override — e.g. Resend's onboarding@resend.dev for
  // local/dev testing, until playpadel.app's domain is verified on Resend —
  // takes effect without a code change or redeploy.
  it("sends from RESEND_FROM_ADDRESS when it's set", async () => {
    const previousApiKey = process.env.RESEND_API_KEY;
    const previousFromAddress = process.env.RESEND_FROM_ADDRESS;
    process.env.RESEND_API_KEY = "test_key";
    process.env.RESEND_FROM_ADDRESS = "onboarding@resend.dev";
    sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });

    await dispatch({
      type: "PAYMENT_CONFIRMED",
      clubId: "club_1",
      recipientId: "user_1",
      recipientEmail: "user@example.com",
      recipientName: "User",
      params: {
        userName: "User",
        invoiceNumber: 1,
        total: 100,
        currency: "USD",
      },
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "onboarding@resend.dev" }),
    );

    process.env.RESEND_API_KEY = previousApiKey;
    process.env.RESEND_FROM_ADDRESS = previousFromAddress;
  });
});

describe("notifyAllAdmins", () => {
  beforeEach(() => {
    createNotificationMock.mockReset();
    updateNotificationStatusMock.mockReset();
    sendMock.mockReset();
    listAdminRecipientsMock.mockReset();
    getUserProfileMock.mockReset();
    getUserProfileMock.mockResolvedValue({ locale: "en" });
    createNotificationMock.mockImplementation(
      async (data: { recipientId: string }) => ({
        id: `notif_${data.recipientId}`,
        clubId: null,
        type: "CLUB_PENDING_APPROVAL",
        recipientId: data.recipientId,
        recipientEmail: "admin@example.com",
        title: "subj",
        message: "<p>html</p>",
        status: "PENDING",
        createdAt: new Date(),
      }),
    );
  });

  it("fetches every admin and dispatches one in-app notification per admin, mapping id/email/displayName", async () => {
    listAdminRecipientsMock.mockResolvedValue([
      { id: "admin_1", email: "admin1@example.com", displayName: "Admin One" },
      { id: "admin_2", email: "admin2@example.com", displayName: "Admin Two" },
    ]);

    await notifyAllAdmins({
      type: "CLUB_PENDING_APPROVAL",
      clubId: "club_1",
      params: { clubName: "New Club" },
      sendEmail: false,
    });

    expect(listAdminRecipientsMock).toHaveBeenCalledTimes(1);
    expect(createNotificationMock).toHaveBeenCalledTimes(2);
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_1",
        type: "CLUB_PENDING_APPROVAL",
        recipientId: "admin_1",
        recipientEmail: "admin1@example.com",
        title: "A new club is pending approval",
        message: expect.stringContaining("New Club"),
      }),
    );
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_1",
        type: "CLUB_PENDING_APPROVAL",
        recipientId: "admin_2",
        recipientEmail: "admin2@example.com",
        title: "A new club is pending approval",
        message: expect.stringContaining("New Club"),
      }),
    );
    // sendEmail: false was passed through to each dispatch call, so Resend
    // is never invoked and every row is marked SKIPPED.
    expect(sendMock).not.toHaveBeenCalled();
    expect(updateNotificationStatusMock).toHaveBeenCalledWith(
      "notif_admin_1",
      "SKIPPED",
    );
    expect(updateNotificationStatusMock).toHaveBeenCalledWith(
      "notif_admin_2",
      "SKIPPED",
    );
  });

  it("resolves without creating any notification when there are no admins", async () => {
    listAdminRecipientsMock.mockResolvedValue([]);

    await notifyAllAdmins({
      type: "SYSTEM_JOB_FAILED",
      clubId: null,
      params: { kind: "CRON", name: "test", errorMessage: "boom" },
    });

    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("dispatches to every admin concurrently rather than sequentially", async () => {
    listAdminRecipientsMock.mockResolvedValue([
      { id: "admin_1", email: "admin1@example.com", displayName: "Admin One" },
      { id: "admin_2", email: "admin2@example.com", displayName: "Admin Two" },
    ]);
    let concurrentCalls = 0;
    let maxConcurrentCalls = 0;
    createNotificationMock.mockImplementation(
      async (data: { recipientId: string }) => {
        concurrentCalls += 1;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        await Promise.resolve();
        concurrentCalls -= 1;
        return {
          id: `notif_${data.recipientId}`,
          clubId: null,
          type: "SYSTEM_JOB_FAILED",
          recipientId: data.recipientId,
          recipientEmail: "admin@example.com",
          title: "subj",
          message: "<p>html</p>",
          status: "PENDING",
          createdAt: new Date(),
        };
      },
    );

    await notifyAllAdmins({
      type: "SYSTEM_JOB_FAILED",
      clubId: null,
      params: { kind: "CRON", name: "test", errorMessage: "boom" },
    });

    expect(maxConcurrentCalls).toBe(2);
  });
});
