import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { logSystemJobMock } = vi.hoisted(() => ({
  logSystemJobMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: vi.fn(),
}));

vi.mock("@/core/users/services/users.service", () => ({
  anonymizeUserProfile: vi.fn(),
  syncUserProfileFromClerk: vi.fn(),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/core/systemJobs/services/systemJobs.service", () => ({
  logSystemJob: logSystemJobMock,
}));

import { verifyWebhook } from "@clerk/nextjs/webhooks";
import {
  anonymizeUserProfile,
  syncUserProfileFromClerk,
} from "@/core/users/services/users.service";
import { logAudit } from "@/core/audit/services/audit.service";
import { POST } from "./route";

const verifyWebhookMock = verifyWebhook as ReturnType<typeof vi.fn>;
const anonymizeUserProfileMock = anonymizeUserProfile as ReturnType<
  typeof vi.fn
>;
const syncUserProfileFromClerkMock = syncUserProfileFromClerk as ReturnType<
  typeof vi.fn
>;
const logAuditMock = logAudit as ReturnType<typeof vi.fn>;

function makeRequest() {
  return new NextRequest("https://app.example.com/api/webhooks/clerk", {
    method: "POST",
    body: "{}",
  });
}

beforeEach(() => {
  verifyWebhookMock.mockReset();
  anonymizeUserProfileMock.mockReset();
  syncUserProfileFromClerkMock.mockReset();
  logAuditMock.mockReset();
  logSystemJobMock.mockReset();
  anonymizeUserProfileMock.mockResolvedValue(undefined);
  syncUserProfileFromClerkMock.mockResolvedValue(undefined);
});

describe("POST /api/webhooks/clerk — existing behavior", () => {
  it("returns 401 when signature verification fails", async () => {
    verifyWebhookMock.mockRejectedValue(new Error("invalid signature"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(anonymizeUserProfileMock).not.toHaveBeenCalled();
  });

  it("anonymizes the user profile and acks on user.deleted", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: { id: "user_1" },
    });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(anonymizeUserProfileMock).toHaveBeenCalledWith(
      "user_1",
      "system:clerk-webhook",
    );
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.anonymized",
        entityId: "user_1",
      }),
    );
  });

  it("acks without anonymizing when user.deleted carries no id", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: {},
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(anonymizeUserProfileMock).not.toHaveBeenCalled();
  });

  it("syncs the user profile and acks on user.updated", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.updated",
      data: {
        id: "user_1",
        first_name: "Juan",
        last_name: "Perez",
        email_addresses: [{ email_address: "juan@example.com" }],
        image_url: "https://example.com/photo.png",
      },
    });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(syncUserProfileFromClerkMock).toHaveBeenCalledWith("user_1", {
      displayName: "Juan Perez",
      email: "juan@example.com",
      photoURL: "https://example.com/photo.png",
    });
  });

  it("acks as a no-op for any other event type", async () => {
    verifyWebhookMock.mockResolvedValue({ type: "session.created", data: {} });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(anonymizeUserProfileMock).not.toHaveBeenCalled();
    expect(syncUserProfileFromClerkMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/webhooks/clerk — system job logging", () => {
  it("logs a SUCCESS entry when the response is 2xx", async () => {
    verifyWebhookMock.mockResolvedValue({ type: "session.created", data: {} });

    await POST(makeRequest());

    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "WEBHOOK",
        name: "clerk",
        status: "SUCCESS",
        startedAt: expect.any(Date),
        finishedAt: expect.any(Date),
      }),
    );
  });

  it("logs a FAILURE entry (with the response body as the error message) when the response is not 2xx", async () => {
    verifyWebhookMock.mockRejectedValue(new Error("invalid signature"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "WEBHOOK",
        name: "clerk",
        status: "FAILURE",
        errorMessage: expect.stringContaining("Invalid signature"),
      }),
    );
  });

  it("logs a FAILURE entry and still lets the error propagate when the handler itself throws unexpectedly", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: { id: "user_1" },
    });
    anonymizeUserProfileMock.mockRejectedValue(new Error("unexpected crash"));

    await expect(POST(makeRequest())).rejects.toThrow("unexpected crash");

    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "WEBHOOK",
        name: "clerk",
        status: "FAILURE",
        errorMessage: "unexpected crash",
      }),
    );
  });
});
