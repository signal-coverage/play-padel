import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  createNotificationMock,
  updateNotificationStatusMock,
  sendMock,
  listAdminRecipientsMock,
} = vi.hoisted(() => ({
  createNotificationMock: vi.fn(),
  updateNotificationStatusMock: vi.fn(),
  sendMock: vi.fn(),
  listAdminRecipientsMock: vi.fn(),
}));

vi.mock("@/core/notifications/services/notifications.service", () => ({
  createNotification: createNotificationMock,
  updateNotificationStatus: updateNotificationStatusMock,
  listAdminRecipients: listAdminRecipientsMock,
}));

vi.mock("@/lib/email/resend", () => ({
  getResendClient: () => ({
    emails: { send: sendMock },
  }),
}));

import { dispatch, notifyAllAdmins } from "./dispatcher";

describe("dispatch — sendEmail: false (in-app-only notification)", () => {
  beforeEach(() => {
    createNotificationMock.mockReset();
    updateNotificationStatusMock.mockReset();
    sendMock.mockReset();
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
      subject: "subj",
      html: "<p>html</p>",
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
      subject: "subj",
      html: "<p>html</p>",
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
      subject: "subj",
      html: "<p>html</p>",
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(updateNotificationStatusMock).toHaveBeenCalledWith(
      "notif_1",
      "SENT",
      expect.objectContaining({ sentAt: expect.any(Date) }),
    );

    process.env.RESEND_API_KEY = previousApiKey;
  });

  it("sends from the default noreply@playpadel.app address when RESEND_FROM_ADDRESS isn't set", async () => {
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
      subject: "subj",
      html: "<p>html</p>",
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "noreply@playpadel.app" }),
    );

    process.env.RESEND_API_KEY = previousApiKey;
    process.env.RESEND_FROM_ADDRESS = previousFromAddress;
  });

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
      subject: "subj",
      html: "<p>html</p>",
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
      subject: "New club pending approval",
      html: "<p>html</p>",
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
        title: "New club pending approval",
        message: "<p>html</p>",
      }),
    );
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_1",
        type: "CLUB_PENDING_APPROVAL",
        recipientId: "admin_2",
        recipientEmail: "admin2@example.com",
        title: "New club pending approval",
        message: "<p>html</p>",
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
      subject: "Job failed",
      html: "<p>html</p>",
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
      subject: "Job failed",
      html: "<p>html</p>",
    });

    expect(maxConcurrentCalls).toBe(2);
  });
});
