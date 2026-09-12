"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { fireSuccessCelebration } from "@/lib/utils/celebration";
import type { Notification } from "@/core/notifications/types";
import { getNotificationToastVariant } from "./utils";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

export const notificationsQueryKey = ["notifications"];

// Intentionally identical to AppNavbar/consts.ts's own copy (itself
// identical to ClubOperationalGate/consts.ts's) — same endpoint, same
// shape, same "kept as a local copy, not imported across folders"
// SRP-per-folder convention. TanStack Query matches queryKey by VALUE, not
// reference, so a third copy here still targets the exact same cached
// query as the other two.
const CLUB_OPERATIONAL_STATUS_QUERY_KEY = [
  "clubs",
  "mercadopago",
  "operational-status",
] as const;

// Intentionally identical to AdminApprovalsView/consts.ts's own
// PENDING_CLUBS_QUERY_KEY — same duplicated-literal convention as above.
// Unlike CLUB_OPERATIONAL_STATUS_QUERY_KEY, this one only ever needs
// invalidating for exactly one notification type (CLUB_PENDING_APPROVAL is
// the only thing that ever adds a row to the admin approval queue), so it's
// narrowed by type below rather than firing on every arrival.
const PENDING_CLUBS_QUERY_KEY = ["admin", "clubs", "pending"] as const;

// Intentionally identical to PlanSelectionModal/consts.ts's own
// MEMBERSHIP_SUBSCRIPTION_QUERY_KEY — same duplicated-literal convention as
// CLUB_OPERATIONAL_STATUS_QUERY_KEY above. Unconditional for the same
// reason: a FREE-plan activation (scripts/menu.ts) or a real Mercado Pago
// webhook settling both change this club's membership subscription without
// necessarily flipping CLUB_OPERATIONAL_STATUS_QUERY_KEY's own operational
// flag (a FREE plan never gets a real payout method — see
// ClubOperationalGate.tsx's own bypass logic), so it needs its own
// invalidation, not just a side effect of the other one.
const MEMBERSHIP_SUBSCRIPTION_QUERY_KEY = ["clubs", "membership"] as const;

// Same key MyReservations/consts.ts keeps its own copy of — narrowed (like
// PENDING_CLUBS_QUERY_KEY) since only these three types ever touch a
// player's own reservations.
const MY_RESERVATIONS_BASE_KEY = ["player", "my-reservations"] as const;

// Same keys ReservationsView/hooks.ts uses directly (inline literals there,
// not exported consts) — the owner's Reservations table. Narrowed to
// RESERVATION_PAYMENT_CONFLICT: that's the one case where the underlying
// Reservation row is deliberately left unchanged (still SCHEDULED), so the
// owner's own SSE stream there (fingerprinted by updatedAt) never notices
// anything changed on its own.
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

export function useNotifications() {
  const queryClient = useQueryClient();
  const { refetchProfile } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  // null (not an empty Set) is the "haven't established a baseline yet"
  // state — distinguishes "first fetch ever, nothing is actually new" from
  // "second+ fetch with zero notifications", which an empty Set alone
  // can't.
  const seenIdsRef = useRef<Set<string> | null>(null);

  const query = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () =>
      fetchJson<{ notifications: Notification[]; unreadCount: number }>(
        "/api/notifications",
      ),
    refetchInterval: 30_000,
  });

  const notifications = query.data?.notifications;
  useEffect(() => {
    if (!notifications) return;
    const seenIds = seenIdsRef.current;
    if (seenIds === null) {
      // First successful fetch this session — every row here already
      // existed before we started watching, not a fresh arrival.
      seenIdsRef.current = new Set(notifications.map((n) => n.id));
      return;
    }

    const newArrivals = notifications.filter((n) => !seenIds.has(n.id));
    seenIdsRef.current = new Set(notifications.map((n) => n.id));
    if (newArrivals.length === 0) return;

    // A freshly-arrived notification often means something else in the app
    // is now stale too — e.g. CLUB_APPROVED means the owner's operational-
    // status gate (and the navbar links it controls) should stop saying
    // "Your club is under review" without the owner having to manually
    // refresh the page. Unconditional (not narrowed to specific
    // notification types): correctness here matters more than saving one
    // cheap GET, and it stays correct automatically if a future
    // notification type also ends up affecting this.
    queryClient.invalidateQueries({
      queryKey: CLUB_OPERATIONAL_STATUS_QUERY_KEY,
    });
    queryClient.invalidateQueries({
      queryKey: MEMBERSHIP_SUBSCRIPTION_QUERY_KEY,
    });

    // A brand-new CLUB_PENDING_APPROVAL means a club just entered the admin
    // queue — refresh it so an admin watching AdminApprovalsView sees the
    // new row without a manual reload, same as the operational-status
    // invalidation above but narrowed (see PENDING_CLUBS_QUERY_KEY's own
    // comment for why this one IS narrowed).
    if (newArrivals.some((n) => n.type === "CLUB_PENDING_APPROVAL")) {
      queryClient.invalidateQueries({ queryKey: PENDING_CLUBS_QUERY_KEY });
    }

    // A brand-new RESERVATION_CANCELLED, PAYMENT_CONFIRMED, or
    // RESERVATION_UPDATED means one of THIS player's own reservations
    // changed (cancelled by the club, payment confirmed, or
    // rescheduled/completed/no-show) — refresh My Reservations, which
    // (unlike ReservationsView/BrowseCourts) has no polling or SSE of its
    // own to pick this up otherwise.
    if (
      newArrivals.some((n) =>
        (
          [
            "RESERVATION_CANCELLED",
            "PAYMENT_CONFIRMED",
            "RESERVATION_UPDATED",
          ] as const
        ).includes(
          n.type as
            | "RESERVATION_CANCELLED"
            | "PAYMENT_CONFIRMED"
            | "RESERVATION_UPDATED",
        ),
      )
    ) {
      queryClient.invalidateQueries({ queryKey: MY_RESERVATIONS_BASE_KEY });
    }

    // A brand-new RESERVATION_PAYMENT_CONFLICT means an owner watching
    // Reservations needs to manually review a conflicting booking — the
    // underlying row is deliberately left unchanged (still SCHEDULED), so
    // the owner's own SSE stream there (fingerprinted by updatedAt) never
    // notices anything on its own.
    if (newArrivals.some((n) => n.type === "RESERVATION_PAYMENT_CONFLICT")) {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: COURT_SLOTS_QUERY_KEY });
    }

    // A brand-new WAITLIST_SLOT_AVAILABLE means a slot just opened up for a
    // player waiting on it — Browse Courts already polls every 15s on its
    // own, so this mostly just closes the gap between "toast arrives" and
    // "the player clicks through and sees it".
    if (newArrivals.some((n) => n.type === "WAITLIST_SLOT_AVAILABLE")) {
      queryClient.invalidateQueries({
        queryKey: PLAYER_CLUB_AVAILABILITY_BASE_KEY,
      });
    }

    // A brand-new CLUB_UPDATED_BY_ADMIN means an admin edited the viewer's
    // own club's settings on their behalf — refresh the owner-facing
    // "current club" query so they see the change without a manual reload.
    if (newArrivals.some((n) => n.type === "CLUB_UPDATED_BY_ADMIN")) {
      queryClient.invalidateQueries({ queryKey: CLUB_CURRENT_QUERY_KEY });
    }

    // A brand-new ADMIN_ACCESS_GRANTED, ADMIN_ACCESS_REVOKED, or
    // PROFILE_UPDATED_BY_ADMIN means THIS viewer's own UserProfile just
    // changed server-side — re-fetch their profile (AuthProvider's own
    // /api/me lookup) so `user.isAdmin` (and any admin-edited field, e.g.
    // padelCategory/preferredSide/dominantHand/contact info) updates live,
    // instead of only after a manual reload. The Admin nav group (see
    // AppNavbar's getVisibleNavItems, gated on isAdmin) appears/disappears
    // as a side effect of the same refetch.
    const grantedArrival = newArrivals.find(
      (n) => n.type === "ADMIN_ACCESS_GRANTED",
    );
    if (
      grantedArrival ||
      newArrivals.some(
        (n) =>
          n.type === "ADMIN_ACCESS_REVOKED" ||
          n.type === "PROFILE_UPDATED_BY_ADMIN",
      )
    ) {
      void refetchProfile();
    }

    // The big tennis-ball drop (see components/SuccessCelebration) — this
    // is a genuinely exciting moment for the recipient, same "full-screen
    // celebration" treatment as a booking or payment confirmation
    // elsewhere in the app. Deliberately GRANTED-only: losing admin access
    // (ADMIN_ACCESS_REVOKED) still needs the live nav refresh above, just
    // never the celebration. shouldReduceMotion check mirrors every other
    // fireSuccessCelebration() caller's own convention (see e.g.
    // BrowseCourts.tsx) — SuccessCelebrationPortal checks it again too, but
    // callers are expected to skip firing it at all rather than rely on
    // that as the only guard.
    if (grantedArrival && !shouldReduceMotion) {
      fireSuccessCelebration();
    }
  }, [notifications, queryClient, refetchProfile, shouldReduceMotion]);

  return query;
}

// Opens GET /api/notifications/stream (Server-Sent Events) and, the instant
// the server notices a genuinely new notification, shows a toast for it AND
// invalidates notificationsQueryKey so the bell's list/unread-count catch up
// immediately too — instead of waiting out useNotifications' own 30s poll.
// Native EventSource reconnects automatically on any connection close
// (including the server's own deliberate MAX_CONNECTION_MS handoff — see
// app/api/notifications/stream/route.ts), so no manual reconnect logic is
// needed here.
export function useNotificationStream() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/notifications/stream");

    function handleNotification(event: MessageEvent) {
      const notification = JSON.parse(event.data) as Notification;
      const variant = getNotificationToastVariant(notification.type);
      toast[variant](notification.title);
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    }

    source.addEventListener("notification", handleNotification);

    return () => {
      source.removeEventListener("notification", handleNotification);
      source.close();
    };
  }, [queryClient]);
}

type NotificationsQueryData = {
  notifications: Notification[];
  unreadCount: number;
};

// Marking everything read has no meaningful failure mode a user needs to
// wait around for (it's non-destructive and instantly reversible by reading
// something new), so this updates the badge/dots optimistically — before the
// PATCH even resolves — instead of showing a loading state and waiting on a
// round trip. onError rolls the optimistic change back if the PATCH turns
// out to have failed; onSettled still reconciles with the server in the
// background either way.
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ ok: true }>("/api/notifications/read-all", {
        method: "PATCH",
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const previous = queryClient.getQueryData<NotificationsQueryData>(
        notificationsQueryKey,
      );
      queryClient.setQueryData<NotificationsQueryData>(
        notificationsQueryKey,
        (old) =>
          old && {
            unreadCount: 0,
            notifications: old.notifications.map((notification) => ({
              ...notification,
              readAt: notification.readAt ?? new Date(),
            })),
          },
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationsQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });
}

// Same optimistic-then-reconcile shape as useMarkAllAsRead, scoped to one
// notification: clicking a notification is a "read + navigate away" action,
// so there's no useful moment to show a loading state before the PATCH
// resolves — the read receipt should just already look applied.
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      fetchJson<{ ok: true }>(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      }),
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const previous = queryClient.getQueryData<NotificationsQueryData>(
        notificationsQueryKey,
      );
      queryClient.setQueryData<NotificationsQueryData>(
        notificationsQueryKey,
        (old) => {
          if (!old) return old;
          const target = old.notifications.find((n) => n.id === notificationId);
          if (!target || target.readAt) return old;
          return {
            unreadCount: Math.max(0, old.unreadCount - 1),
            notifications: old.notifications.map((n) =>
              n.id === notificationId ? { ...n, readAt: new Date() } : n,
            ),
          };
        },
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationsQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });
}
