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
  getUserProfile: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  updateClub: vi.fn(),
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
  getUserProfile,
} from "@/core/users/services/users.service";
import { updateClub } from "@/core/clubs/services/clubs.service";
import { logAudit } from "@/core/audit/services/audit.service";
import { POST } from "./route";

const verifyWebhookMock = verifyWebhook as ReturnType<typeof vi.fn>;
const anonymizeUserProfileMock = anonymizeUserProfile as ReturnType<
  typeof vi.fn
>;
const syncUserProfileFromClerkMock = syncUserProfileFromClerk as ReturnType<
  typeof vi.fn
>;
const getUserProfileMock = getUserProfile as ReturnType<typeof vi.fn>;
const updateClubMock = updateClub as ReturnType<typeof vi.fn>;
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
  getUserProfileMock.mockReset();
  updateClubMock.mockReset();
  logAuditMock.mockReset();
  logSystemJobMock.mockReset();
  anonymizeUserProfileMock.mockResolvedValue(true);
  syncUserProfileFromClerkMock.mockResolvedValue(undefined);
  getUserProfileMock.mockResolvedValue(null);
  updateClubMock.mockResolvedValue(undefined);
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

  // The real bug reported live: a Clerk user who signed up but never
  // finished onboarding has no UserProfile row at all (see
  // app/api/onboarding/route.ts — that row is only ever created there, not
  // by any webhook). Deleting that Clerk account still fires user.deleted;
  // anonymizeUserProfile no-ops (returns false) instead of throwing
  // Prisma's "No record was found for an update", and this must still
  // 200-ack (Clerk retries on anything else) without logging a misleading
  // "user.anonymized" audit entry for a profile that was never touched.
  it("acks without logging an audit entry when user.deleted arrives for a Clerk user who has no UserProfile row", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: { id: "user_ghost" },
    });
    anonymizeUserProfileMock.mockResolvedValue(false);

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(logAuditMock).not.toHaveBeenCalled();
  });

  it("acks without anonymizing when user.deleted carries no id", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: {},
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(anonymizeUserProfileMock).not.toHaveBeenCalled();
    expect(updateClubMock).not.toHaveBeenCalled();
  });

  it("deactivates the deleted owner's club — an orphaned club must stop counting as active", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: { id: "user_1" },
    });
    getUserProfileMock.mockResolvedValue({
      id: "user_1",
      role: "owner",
      clubId: "club_1",
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(updateClubMock).toHaveBeenCalledWith(
      "club_1",
      { status: "INACTIVE" },
      "system:clerk-webhook",
    );
  });

  it("does not touch any club when the deleted user was a player, not an owner", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: { id: "user_1" },
    });
    getUserProfileMock.mockResolvedValue({
      id: "user_1",
      role: "player",
      clubId: undefined,
    });

    await POST(makeRequest());

    expect(updateClubMock).not.toHaveBeenCalled();
  });

  it("does not touch any club when the deleted owner never had a clubId", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: { id: "user_1" },
    });
    getUserProfileMock.mockResolvedValue({
      id: "user_1",
      role: "owner",
      clubId: undefined,
    });

    await POST(makeRequest());

    expect(updateClubMock).not.toHaveBeenCalled();
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
