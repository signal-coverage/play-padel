import { describe, it, expect } from "vitest";
import { getNotificationHref, getNotificationToastVariant } from "./utils";
import type { NotificationType } from "@/core/notifications/types";

describe("getNotificationHref", () => {
  it("routes a player's reservation/membership-payment notifications to My Reservations", () => {
    const types: NotificationType[] = [
      "RESERVATION_REMINDER",
      "RESERVATION_CANCELLED",
      "PAYMENT_CONFIRMED",
      "RESERVATION_UPDATED",
      "RESERVATION_PAYMENT_HOLD_EXPIRED",
    ];
    for (const type of types) {
      expect(getNotificationHref(type, null)).toBe(
        "/dashboard/my-reservations",
      );
    }
  });

  it("routes a player's own profile change to their dashboard", () => {
    expect(getNotificationHref("PROFILE_UPDATED_BY_ADMIN", null)).toBe(
      "/dashboard",
    );
  });

  it("routes a waitlist notification to Browse Courts, scoped to the club when known", () => {
    expect(getNotificationHref("WAITLIST_SLOT_AVAILABLE", "club_1")).toBe(
      "/dashboard/browse?club=club_1",
    );
    expect(getNotificationHref("WAITLIST_SLOT_AVAILABLE", null)).toBe(
      "/dashboard/browse",
    );
  });

  it("routes an owner's club-lifecycle and billing notifications to their club settings, scoped to the club when known", () => {
    const types: NotificationType[] = [
      "CLUB_APPROVED",
      "CLUB_REJECTED",
      "CLUB_SUSPENDED",
      "CLUB_OPERATIONAL_READY",
      "MEMBERSHIP_PAST_DUE",
      "PAYMENT_RECEIVED",
      "MEMBERSHIP_CANCELLED",
      "CLUB_UPDATED_BY_ADMIN",
    ];
    for (const type of types) {
      // The clubId query param is what actually matters here: an owner
      // who's ALSO an admin (isAdmin is independent of role — see
      // prisma/schema.prisma's UserProfile.isAdmin comment) lands on
      // AdminClubSettingsView instead of the owner-only ClubSettingsTabs
      // (see app/dashboard/settings/club/page.tsx), which needs ?clubId=
      // to pre-select their club rather than dumping them on its picker
      // with nothing selected. A plain owner's ClubSettingsTabs branch
      // ignores the param and scopes to their own club regardless, so
      // adding it is never harmful there.
      expect(getNotificationHref(type, "club_1")).toBe(
        "/dashboard/settings/club?clubId=club_1",
      );
    }
  });

  it("falls back to the bare club settings path when clubId isn't known", () => {
    expect(getNotificationHref("CLUB_APPROVED", null)).toBe(
      "/dashboard/settings/club",
    );
  });

  it("routes an admin's platform notifications to the matching admin queue", () => {
    expect(getNotificationHref("CLUB_PENDING_APPROVAL", "club_1")).toBe(
      "/dashboard/admin-approvals",
    );
    expect(getNotificationHref("SYSTEM_JOB_FAILED", null)).toBe(
      "/dashboard/admin-status",
    );
  });

  it("routes a reservation/payment conflict to the owner's Reservations table for manual review", () => {
    expect(getNotificationHref("RESERVATION_PAYMENT_CONFLICT", "club_1")).toBe(
      "/dashboard/reservations",
    );
  });

  it("routes a freshly-granted admin to the new platform Overview page", () => {
    expect(getNotificationHref("ADMIN_ACCESS_GRANTED", null)).toBe(
      "/dashboard/admin-overview",
    );
  });

  it("routes a freshly-revoked admin to their regular dashboard (no admin surfaces left to see)", () => {
    expect(getNotificationHref("ADMIN_ACCESS_REVOKED", null)).toBe(
      "/dashboard",
    );
  });
});

describe("getNotificationToastVariant", () => {
  it("treats genuinely good news as success", () => {
    const types: NotificationType[] = [
      "CLUB_APPROVED",
      "CLUB_OPERATIONAL_READY",
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIVED",
      "WAITLIST_SLOT_AVAILABLE",
      "ADMIN_ACCESS_GRANTED",
    ];
    for (const type of types) {
      expect(getNotificationToastVariant(type)).toBe("success");
    }
  });

  it("treats genuinely bad news as error", () => {
    const types: NotificationType[] = [
      "CLUB_REJECTED",
      "CLUB_SUSPENDED",
      "RESERVATION_CANCELLED",
      "RESERVATION_PAYMENT_CONFLICT",
      "SYSTEM_JOB_FAILED",
      "MEMBERSHIP_CANCELLED",
      "RESERVATION_PAYMENT_HOLD_EXPIRED",
    ];
    for (const type of types) {
      expect(getNotificationToastVariant(type)).toBe("error");
    }
  });

  it("treats a billing problem that isn't outright bad news yet as a warning", () => {
    expect(getNotificationToastVariant("MEMBERSHIP_PAST_DUE")).toBe("warning");
  });

  it("treats plain heads-up notifications as info", () => {
    expect(getNotificationToastVariant("RESERVATION_REMINDER")).toBe("info");
    expect(getNotificationToastVariant("CLUB_PENDING_APPROVAL")).toBe("info");
    expect(getNotificationToastVariant("ADMIN_ACCESS_REVOKED")).toBe("info");
    expect(getNotificationToastVariant("RESERVATION_UPDATED")).toBe("info");
    expect(getNotificationToastVariant("PROFILE_UPDATED_BY_ADMIN")).toBe(
      "info",
    );
    expect(getNotificationToastVariant("CLUB_UPDATED_BY_ADMIN")).toBe("info");
  });
});
