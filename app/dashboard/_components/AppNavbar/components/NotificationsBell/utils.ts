import type { NotificationType } from "@/core/notifications/types";

/**
 * Where clicking a notification should take the user — derived purely from
 * its `type` (+ `clubId` for the one type that can use it), matching each
 * type's actual dispatch site rather than guessing:
 *
 * - Player-facing (reservations/membership payment): RESERVATION_REMINDER,
 *   RESERVATION_CANCELLED (core/reservations/services/reservations.service.ts),
 *   PAYMENT_CONFIRMED (core/billing/services/billing.service.ts) -> their
 *   own reservations list.
 * - WAITLIST_SLOT_AVAILABLE (core/waitlist/services/waitlist.service.ts) ->
 *   Browse Courts, scoped to the club if known. The persisted Notification
 *   row has no courtId/date to deep-link further than that — unlike this
 *   same event's email (lib/email/templates/WaitlistSlotAvailable.tsx),
 *   which builds a full court+date link from the live waitlist entry at
 *   send time, not from a Notification row read back later.
 * - Owner-facing (their own club): CLUB_APPROVED, CLUB_REJECTED
 *   (core/clubs/services/clubs.service.ts), CLUB_SUSPENDED
 *   (app/api/admin/club-status/route.ts), CLUB_OPERATIONAL_READY
 *   (core/clubs/services/clubs.service.ts), MEMBERSHIP_PAST_DUE
 *   (core/billing/services/membership.service.ts), PAYMENT_RECEIVED
 *   (core/billing/services/billing.service.ts) -> their club's settings,
 *   with ?clubId= appended when known. `isAdmin` is independent of `role`
 *   (see prisma/schema.prisma's UserProfile.isAdmin comment), so the
 *   recipient owner might ALSO be an admin — app/dashboard/settings/club/
 *   page.tsx renders AdminClubSettingsView for them instead of the
 *   owner-only ClubSettingsTabs, and that view needs ?clubId= to
 *   pre-select their club rather than landing them on its bare picker
 *   with nothing selected. A plain (non-admin) owner's ClubSettingsTabs
 *   ignores the param and scopes to their own club regardless, so adding
 *   it is never harmful there.
 * - Admin-facing: CLUB_PENDING_APPROVAL (dispatched to every admin via
 *   notifyAllAdmins) -> the approvals queue; SYSTEM_JOB_FAILED (same) ->
 *   the system status page.
 * - RESERVATION_PAYMENT_CONFLICT (app/api/webhooks/mercadopago/route.ts,
 *   sent to the club owner) -> their Reservations table, where the
 *   conflicting booking needs manual review.
 * - ADMIN_ACCESS_GRANTED (scripts/actions/grant-admin.ts) -> the Admin
 *   dropdown's new Overview page, the first thing worth seeing once you've
 *   actually got admin access.
 * - ADMIN_ACCESS_REVOKED (scripts/actions/revoke-admin.ts) -> the regular
 *   dashboard — every admin-only surface this recipient could have landed
 *   on is gone the moment this fires (see useNotifications in ./hooks,
 *   which refetches their profile on arrival the same way it does for
 *   ADMIN_ACCESS_GRANTED, so the Admin nav group itself disappears too).
 * - MEMBERSHIP_CANCELLED, CLUB_UPDATED_BY_ADMIN (both
 *   core/billing/services/membership.service.ts /
 *   app/api/admin/clubs/[clubId]/route.ts) -> their club's settings, same
 *   owner-facing group as CLUB_APPROVED etc. above.
 * - RESERVATION_UPDATED (core/reservations/services/reservations.service.ts,
 *   an owner/staff reschedule or a post-match status change) -> the
 *   player's own My Reservations list, same group as RESERVATION_CANCELLED.
 * - PROFILE_UPDATED_BY_ADMIN (app/api/admin/players/[userId]/route.ts) ->
 *   the player's own dashboard — there's no dedicated "my profile" page to
 *   deep-link into.
 */
export function getNotificationHref(
  type: NotificationType,
  clubId: string | null,
): string {
  switch (type) {
    case "RESERVATION_REMINDER":
    case "RESERVATION_CANCELLED":
    case "PAYMENT_CONFIRMED":
    case "RESERVATION_UPDATED":
      return "/dashboard/my-reservations";
    case "WAITLIST_SLOT_AVAILABLE":
      return clubId ? `/dashboard/browse?club=${clubId}` : "/dashboard/browse";
    case "CLUB_APPROVED":
    case "CLUB_REJECTED":
    case "CLUB_SUSPENDED":
    case "CLUB_OPERATIONAL_READY":
    case "MEMBERSHIP_PAST_DUE":
    case "PAYMENT_RECEIVED":
    case "MEMBERSHIP_CANCELLED":
    case "CLUB_UPDATED_BY_ADMIN":
      return clubId
        ? `/dashboard/settings/club?clubId=${clubId}`
        : "/dashboard/settings/club";
    case "CLUB_PENDING_APPROVAL":
      return "/dashboard/admin-approvals";
    case "SYSTEM_JOB_FAILED":
      return "/dashboard/admin-status";
    case "RESERVATION_PAYMENT_CONFLICT":
      return "/dashboard/reservations";
    case "ADMIN_ACCESS_GRANTED":
      return "/dashboard/admin-overview";
    case "ADMIN_ACCESS_REVOKED":
    case "PROFILE_UPDATED_BY_ADMIN":
      return "/dashboard";
  }
}

export type NotificationToastVariant = "success" | "error" | "warning" | "info";

/**
 * Which sonner toast function (see components/ui/sonner.tsx's own
 * per-type bouncing-ball icons) a freshly-arrived notification's toast
 * should use — see useNotificationStream in ./hooks, the sole caller.
 * Grouped by genuine outcome, not by recipient: "good news" vs "bad news"
 * vs "not great yet, but not broken" vs "just a heads-up", matching what
 * the underlying event actually means rather than who it's for.
 */
export function getNotificationToastVariant(
  type: NotificationType,
): NotificationToastVariant {
  switch (type) {
    case "CLUB_APPROVED":
    case "CLUB_OPERATIONAL_READY":
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
    case "WAITLIST_SLOT_AVAILABLE":
    case "ADMIN_ACCESS_GRANTED":
      return "success";
    case "CLUB_REJECTED":
    case "CLUB_SUSPENDED":
    case "RESERVATION_CANCELLED":
    case "RESERVATION_PAYMENT_CONFLICT":
    case "SYSTEM_JOB_FAILED":
    case "MEMBERSHIP_CANCELLED":
      return "error";
    case "MEMBERSHIP_PAST_DUE":
      return "warning";
    case "RESERVATION_REMINDER":
    case "CLUB_PENDING_APPROVAL":
    case "ADMIN_ACCESS_REVOKED":
    case "RESERVATION_UPDATED":
    case "PROFILE_UPDATED_BY_ADMIN":
    case "CLUB_UPDATED_BY_ADMIN":
      return "info";
  }
}
