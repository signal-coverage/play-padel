import { prisma } from "@/infrastructure/db/client";
import { logAudit } from "@/core/audit/services/audit.service";
import {
  CLUB_OPERATIONAL_WHERE,
  getClubOperationalStatus,
} from "@/lib/mercadopago/operationalStatus";
import { dispatch } from "@/lib/notifications/dispatcher";
import type {
  Club,
  ClubStatus,
  CreateClubInput,
  PendingClubSummary,
  Plan,
  UpdateClubInput,
} from "@/core/clubs/types";

type ClubRow = NonNullable<Awaited<ReturnType<typeof prisma.club.findUnique>>>;

function toClub(row: ClubRow): Club {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legalName ?? undefined,
    taxId: row.taxId ?? undefined,
    email: row.email,
    phone: row.phone ?? undefined,
    whatsappNumber: row.whatsappNumber ?? undefined,
    address: row.address ?? undefined,
    country: row.country ?? undefined,
    province: row.province ?? undefined,
    city: row.city ?? undefined,
    zipCode: row.zipCode ?? undefined,
    timezone: row.timezone,
    currency: row.currency,
    plan: row.plan as Club["plan"],
    courtLimit: row.courtLimit ?? undefined,
    status: row.status as Club["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  };
}

export async function createClub(
  input: CreateClubInput,
  createdBy: string,
): Promise<Club> {
  const row = await prisma.club.create({
    data: {
      name: input.name,
      legalName: input.legalName ?? null,
      taxId: input.taxId ?? null,
      email: input.email,
      phone: input.phone ?? null,
      whatsappNumber: input.whatsappNumber ?? null,
      address: input.address ?? null,
      country: input.country ?? null,
      province: input.province ?? null,
      city: input.city ?? null,
      zipCode: input.zipCode ?? null,
      timezone: input.timezone,
      currency: input.currency,
      plan: input.plan ?? "BASIC",
      // Deliberately omitted (never a bare `?? undefined` written as a key)
      // unless the caller explicitly passes it — the schema's own
      // @default(APPROVED) applies for every caller except onboarding (see
      // CreateClubInput's approvalStatus doc comment and this change's
      // migration-safety requirement).
      ...(input.approvalStatus ? { approvalStatus: input.approvalStatus } : {}),
      createdBy,
      updatedBy: createdBy,
    },
  });
  return toClub(row);
}

export async function getClubById(id: string): Promise<Club | null> {
  const row = await prisma.club.findUnique({
    where: { id },
  });
  if (!row) return null;
  return toClub(row);
}

// Case/whitespace-insensitive comparison key — address text is free-form and
// never normalized/geocoded, so this only catches an exact-looking retype,
// not every real-world duplicate. Good enough for a warning signal, not for
// a hard uniqueness guarantee.
function duplicateKey(value: string): string {
  return value.trim().toLowerCase();
}

// Admin approval queue (see app/api/admin/clubs/pending/route.ts) — every
// club currently awaiting review, oldest-first so the queue reads
// first-in-first-out. Deliberately narrow (PendingClubSummary, not the full
// Club shape) since this list only needs enough for an admin to decide.
//
// Also flags `possibleDuplicate` — whether ANY other club (any status,
// pending or already approved/rejected) shares this club's email or address
// — so an admin can catch someone accidentally (or deliberately) onboarding
// the same club twice before approving it, without hard-blocking the
// onboarding submission itself over what might be a false positive (see
// PendingClubSummary's own doc comment).
export async function listPendingClubs(): Promise<PendingClubSummary[]> {
  const pending = await prisma.club.findMany({
    where: { approvalStatus: "PENDING" },
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  if (pending.length === 0) return [];

  // One extra query for every OTHER club's email/address, rather than one
  // query per pending club — this list is small (an admin review queue),
  // so an in-memory cross-check is simpler than N+1 duplicate-detection
  // queries and just as correct.
  const allClubs = await prisma.club.findMany({
    select: { id: true, email: true, address: true },
  });

  return pending.map((club) => {
    const email = duplicateKey(club.email);
    const address = club.address ? duplicateKey(club.address) : null;
    const possibleDuplicate = allClubs.some((other) => {
      if (other.id === club.id) return false;
      if (duplicateKey(other.email) === email) return true;
      if (address && other.address && duplicateKey(other.address) === address) {
        return true;
      }
      return false;
    });

    return {
      id: club.id,
      name: club.name,
      email: club.email,
      createdAt: club.createdAt,
      possibleDuplicate,
    };
  });
}

export type ClubApprovalActionResult =
  | { status: "not_found" }
  | { status: "not_pending" }
  | { status: "ok"; clubId: string };

/**
 * Shared not-found/not-pending guard for approveClub/rejectClub below —
 * both only ever act on a club that is currently PENDING (see
 * app/api/admin/clubs/[clubId]/approve/route.ts and .../reject/route.ts for
 * how each status maps to an HTTP response: not_found -> 404, not_pending ->
 * 409, since a re-approve/re-reject attempt on a club someone else already
 * resolved is a state conflict, not a silent no-op).
 */
async function requirePendingClub(
  clubId: string,
): Promise<{ status: "not_found" | "not_pending" } | { status: "ok" }> {
  const existing = await prisma.club.findUnique({
    where: { id: clubId },
    select: { approvalStatus: true },
  });
  if (!existing) return { status: "not_found" };
  if (existing.approvalStatus !== "PENDING") return { status: "not_pending" };
  return { status: "ok" };
}

export async function approveClub(
  clubId: string,
): Promise<ClubApprovalActionResult> {
  const guard = await requirePendingClub(clubId);
  if (guard.status !== "ok") return guard;

  await prisma.club.update({
    where: { id: clubId },
    data: { approvalStatus: "APPROVED" },
  });

  // Notification failure must not affect the approval itself.
  try {
    const owner = await getClubOwner(clubId);
    if (owner) {
      await dispatch({
        type: "CLUB_APPROVED",
        clubId,
        recipientId: owner.id,
        recipientEmail: owner.email,
        recipientName: owner.displayName,
        subject: "Your club has been approved",
        html: "Your club is now approved and can accept reservations.",
        // Sent by email (not just in-app) — approval timing is entirely in
        // an admin's hands, so logging in on the off chance is the owner's
        // only other way to find out; see CLUB_REJECTED below, which stays
        // in-app only since a rejected owner is still mid-onboarding and
        // notices right away.
        sendEmail: true,
      });
    }
  } catch {
    // notification failure must not affect approval recording
  }

  return { status: "ok", clubId };
}

export async function rejectClub(
  clubId: string,
): Promise<ClubApprovalActionResult> {
  const guard = await requirePendingClub(clubId);
  if (guard.status !== "ok") return guard;

  await prisma.club.update({
    where: { id: clubId },
    data: { approvalStatus: "REJECTED" },
  });

  // Notification failure must not affect the rejection itself.
  try {
    const owner = await getClubOwner(clubId);
    if (owner) {
      await dispatch({
        type: "CLUB_REJECTED",
        clubId,
        recipientId: owner.id,
        recipientEmail: owner.email,
        recipientName: owner.displayName,
        subject: "Your club application was not approved",
        html: "Your club application was not approved. Contact support for details.",
        sendEmail: false,
      });
    }
  } catch {
    // notification failure must not affect rejection recording
  }

  return { status: "ok", clubId };
}

// A club's owner is the single UserProfile row scoped to it with
// role: "owner" — used by GET /api/admin/clubs/[clubId] to surface the
// owner's userId for the admin "Impersonate owner" action, and by callers
// that need the owner's photoURL (a club's displayed "photo" is always the
// owner's own Clerk-synced profile photo — see Club.ownerPhotoUrl).
export async function getClubOwner(clubId: string): Promise<{
  id: string;
  displayName: string;
  photoURL: string | null;
  email: string;
} | null> {
  const owner = await prisma.userProfile.findFirst({
    where: { clubId, role: "owner" },
    select: { id: true, displayName: true, photoURL: true, email: true },
  });
  return owner ?? null;
}

/**
 * Dispatches an in-app CLUB_OPERATIONAL_READY notification to the club owner
 * exactly once, the first time a club becomes fully operational
 * (admin-approved AND has some payout method connected). Sent from here
 * rather than at approval time because Settings — where operating hours are
 * actually configured — stays blocked by ClubOperationalGate until the club
 * is operational (see app/dashboard/_components/ClubOperationalGate), so a
 * reminder sent any earlier would point to a page the owner still can't
 * reach.
 *
 * Non-throwing: this is a side effect of "a club just gained a payout
 * method" (Mercado Pago connect callback, bank transfer setup) and must
 * never break the caller's own success path if it fails.
 */
export async function notifyClubOperationalIfNeeded(
  clubId: string,
): Promise<void> {
  try {
    const status = await getClubOperationalStatus(clubId);
    if (!status.operational) return;

    const existing = await prisma.notification.findFirst({
      where: { clubId, type: "CLUB_OPERATIONAL_READY" },
      select: { id: true },
    });
    if (existing) return;

    const owner = await getClubOwner(clubId);
    if (!owner) return;

    await dispatch({
      type: "CLUB_OPERATIONAL_READY",
      clubId,
      recipientId: owner.id,
      recipientEmail: owner.email,
      recipientName: owner.displayName,
      subject: "Your club is ready to accept reservations",
      html: "Your club can now accept real reservations. Don't forget to set your operating hours in Settings so players know when they can book.",
      sendEmail: false,
    });
  } catch {
    // notification failure must not affect the caller's own success path
  }
}

export async function updateClub(
  id: string,
  input: UpdateClubInput,
  updatedBy: string,
): Promise<Club> {
  const row = await prisma.club.update({
    where: { id },
    data: { ...input, updatedBy },
  });

  const actor = await prisma.userProfile.findUnique({
    where: { id: updatedBy },
    select: { displayName: true },
  });
  logAudit({
    clubId: row.id,
    userId: updatedBy,
    userDisplayName: actor?.displayName ?? updatedBy,
    action: "club.updated",
    entity: "Club",
    entityId: row.id,
    metadata: { ...input },
  });

  return toClub(row);
}

/**
 * Clubs regular users can browse and reserve courts at — see
 * docs/reservation-flow.md for the player-facing flow this backs.
 *
 * Filters at the query level via `CLUB_OPERATIONAL_WHERE`, which already
 * includes `status: "ACTIVE"` — so a club must also have a `CONNECTED`
 * Mercado Pago account to appear here. See lib/mercadopago/operationalStatus.ts.
 */
export async function listActiveClubs(): Promise<Club[]> {
  const rows = await prisma.club.findMany({
    where: CLUB_OPERATIONAL_WHERE,
    orderBy: { name: "asc" },
  });
  if (rows.length === 0) return [];

  // A club never has its own independently-editable logo — the "club
  // photo" shown everywhere is always the owner's own Clerk-synced profile
  // photo. Attached here via a SINGLE batched query (never a per-club
  // lookup in a loop — this exact N+1 pattern was previously found and
  // fixed for this same function's caller).
  const clubIds = rows.map((row) => row.id);
  const owners = await prisma.userProfile.findMany({
    where: { clubId: { in: clubIds }, role: "owner" },
    select: { clubId: true, photoURL: true },
  });
  const ownerPhotoUrlByClubId = new Map(
    owners.map((owner) => [owner.clubId, owner.photoURL]),
  );

  return rows.map((row) => ({
    ...toClub(row),
    ownerPhotoUrl: ownerPhotoUrlByClubId.get(row.id) ?? null,
  }));
}

export type AdminClubListItem = Pick<
  Club,
  "id" | "name" | "status" | "plan" | "courtLimit"
> & {
  /**
   * True when the club has no Mercado Pago account at all, the account
   * isn't CONNECTED, or (when connected) its token has already expired or
   * is missing/expiring within MP_TOKEN_EXPIRY_WARNING_DAYS — surfaced so an
   * admin can spot a club about to lose its ability to take payments.
   */
  mpTokenIssue: boolean;
  /** True when the club's own platform membership subscription is PAST_DUE. */
  membershipPastDue: boolean;
  /** True when the club has zero configured ClubOperatingHours rows. */
  noOperatingHours: boolean;
  /**
   * True when the club's ClubMembershipSubscription.plan is "FREE" —
   * deliberately NOT Club.plan (the court-capacity tier). Club.plan is set
   * once at club creation and is essentially never changed afterward;
   * activateFreePlan (core/billing/services/membership.service.ts) only
   * ever sets the membership subscription's plan to "FREE" when an admin
   * comps a club, and explicitly never touches Club.plan. Reading Club.plan
   * here would make this flag permanently false for any club comped through
   * the real flow.
   */
  isFreePlan: boolean;
};

/**
 * Warning threshold, in days, for the admin "club health" indicator: a
 * club's Mercado Pago token is flagged as an issue once it's within this
 * many days of expiring (or already expired) — see listAllClubs.
 */
export const MP_TOKEN_EXPIRY_WARNING_DAYS = 7;

/**
 * Every club on the platform, regardless of status/plan — backs the
 * admin-only club picker (GET /api/admin/clubs, see
 * app/dashboard/settings/club/_components/AdminClubSettingsView). Unlike
 * listActiveClubs, this is intentionally unfiltered: an admin needs to find
 * and manage a club precisely because it might be non-operational. Selects
 * only the fields the picker's list actually renders, plus enough of the
 * MP account / membership subscription / operating-hours relations (via a
 * single include, not follow-up queries) to compute the "club health" flags
 * below in one round-trip.
 */
export async function listAllClubs(): Promise<AdminClubListItem[]> {
  const rows = await prisma.club.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      status: true,
      plan: true,
      courtLimit: true,
      mercadoPagoAccount: { select: { status: true, tokenExpiresAt: true } },
      membershipSubscription: { select: { status: true, plan: true } },
      _count: { select: { operatingHours: true } },
    },
  });

  const warningThreshold = new Date();
  warningThreshold.setDate(
    warningThreshold.getDate() + MP_TOKEN_EXPIRY_WARNING_DAYS,
  );

  return rows.map((row) => {
    const mpAccount = row.mercadoPagoAccount;
    const mpTokenIssue =
      !mpAccount ||
      mpAccount.status !== "CONNECTED" ||
      !mpAccount.tokenExpiresAt ||
      mpAccount.tokenExpiresAt <= warningThreshold;

    return {
      id: row.id,
      name: row.name,
      status: row.status as ClubStatus,
      plan: row.plan as Plan,
      courtLimit: row.courtLimit,
      mpTokenIssue,
      membershipPastDue: row.membershipSubscription?.status === "PAST_DUE",
      noOperatingHours: row._count.operatingHours === 0,
      isFreePlan: row.membershipSubscription?.plan === "FREE",
    };
  });
}
