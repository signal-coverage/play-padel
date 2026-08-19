import { prisma } from "@/infrastructure/db/client";
import { render } from "@react-email/render";
import * as React from "react";
import { dispatch } from "@/lib/notifications/dispatcher";
import { logAudit } from "@/core/audit/services/audit.service";
import { WaitlistSlotAvailable } from "@/lib/email/templates/WaitlistSlotAvailable";
import type { WaitlistEntry, WaitlistEntryStatus } from "@/core/waitlist/types";

type WaitlistEntryRow = NonNullable<
  Awaited<ReturnType<typeof prisma.waitlistEntry.findFirst>>
>;

function toWaitlistEntry(row: WaitlistEntryRow): WaitlistEntry {
  return {
    id: row.id,
    clubId: row.clubId,
    courtId: row.courtId,
    courtName: row.courtName,
    userId: row.userId,
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    status: row.status as WaitlistEntryStatus,
    notifiedAt: row.notifiedAt ?? undefined,
    createdAt: row.createdAt,
  };
}

export interface JoinWaitlistParams {
  courtId: string;
  courtName: string;
  clubId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  userId: string;
}

/**
 * Idempotent join: creates a WAITING row on first join, and resets an
 * existing row back to WAITING (clearing notifiedAt) on rejoin — including
 * when the row was already NOTIFIED. Upserts on the (courtId, scheduledStart,
 * userId) compound unique key so concurrent joins never race a
 * create-then-catch.
 */
export async function joinWaitlist(
  params: JoinWaitlistParams,
): Promise<WaitlistEntry> {
  const row = await prisma.waitlistEntry.upsert({
    where: {
      courtId_scheduledStart_userId: {
        courtId: params.courtId,
        scheduledStart: params.scheduledStart,
        userId: params.userId,
      },
    },
    create: {
      clubId: params.clubId,
      courtId: params.courtId,
      courtName: params.courtName,
      userId: params.userId,
      scheduledStart: params.scheduledStart,
      scheduledEnd: params.scheduledEnd,
      status: "WAITING",
    },
    update: {
      status: "WAITING",
      notifiedAt: null,
    },
  });
  return toWaitlistEntry(row);
}

/**
 * True only for an active (WAITING) entry — a NOTIFIED entry means this
 * player was already told, so the UI should not show them as still waiting
 * unless they explicitly rejoin.
 */
export async function hasActiveWaitlistEntry(
  courtId: string,
  scheduledStart: Date,
  userId: string,
): Promise<boolean> {
  const row = await prisma.waitlistEntry.findFirst({
    where: { courtId, scheduledStart, userId, status: "WAITING" },
  });
  return row !== null;
}

/**
 * Notifies every WAITING entry whose slot start falls within
 * [scheduledStart, scheduledEnd) — the cancelled reservation's actual time
 * span — a broadcast, not a queue: there is no reserved claim window, so
 * everyone waiting on any slot the reservation covered is told at once and
 * the normal booking flow decides who gets it. A single reservation can span
 * multiple 30-min slots (e.g. 18:00-19:30 locks the 18:00, 18:30, and 19:00
 * slots), so matching only the exact reservation start would silently skip
 * waitlisters on the other slots it locked.
 *
 * `excludeUserId` skips the person who owns/cancelled the triggering
 * reservation, so a player who (accidentally or otherwise) joined the
 * waitlist for their own booking never gets emailed about their own
 * cancellation.
 *
 * Entries are processed concurrently (Promise.allSettled) so one entry's
 * failure (lookup, render, dispatch, or persistence) doesn't block or delay
 * the rest, and the caller (cancelReservation, on the booking critical path)
 * isn't held up waiting for every notification to complete serially.
 */
export async function notifyWaitlistForSlot(
  courtId: string,
  scheduledStart: Date,
  scheduledEnd: Date,
  excludeUserId: string,
): Promise<void> {
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      courtId,
      scheduledStart: { gte: scheduledStart, lt: scheduledEnd },
      status: "WAITING",
      userId: { not: excludeUserId },
    },
  });

  await Promise.allSettled(
    entries.map(async (entry) => {
      try {
        const user = await prisma.userProfile.findUnique({
          where: { id: entry.userId },
          select: { email: true, displayName: true },
        });
        const userName = user?.displayName ?? "there";

        const dateKey = `${entry.scheduledStart.getFullYear()}-${String(
          entry.scheduledStart.getMonth() + 1,
        ).padStart(
          2,
          "0",
        )}-${String(entry.scheduledStart.getDate()).padStart(2, "0")}`;

        const html = await render(
          React.createElement(WaitlistSlotAvailable, {
            userName,
            courtName: entry.courtName,
            scheduledStart: entry.scheduledStart,
            clubId: entry.clubId,
            courtId: entry.courtId,
            dateKey,
          }),
        );

        await dispatch({
          type: "WAITLIST_SLOT_AVAILABLE",
          clubId: entry.clubId,
          recipientId: entry.userId,
          recipientEmail: user?.email ?? null,
          recipientName: userName,
          subject: "A slot you were waiting for just opened up",
          html,
        });

        await prisma.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: "NOTIFIED", notifiedAt: new Date() },
        });

        logAudit({
          clubId: entry.clubId,
          userId: entry.userId,
          userDisplayName: userName,
          action: "waitlist.notified",
          entity: "WaitlistEntry",
          entityId: entry.id,
          metadata: { courtId: entry.courtId, courtName: entry.courtName },
        });
      } catch (err) {
        console.error(
          `[waitlist] Failed to notify entry ${entry.id} for court ${courtId}:`,
          err,
        );
        // Swallow — one failure must not block or fail the others.
      }
    }),
  );
}
