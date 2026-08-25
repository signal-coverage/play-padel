"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Plan } from "@/core/clubs/types";
import type { MembershipRenewalModeValue } from "@/core/billing/services/membership.service";
import { MEMBERSHIP_SUBSCRIPTION_QUERY_KEY } from "./consts";
import type {
  MembershipCycleValue,
  MembershipSubscriptionResponse,
} from "./types";

// Duplicated (a few lines) rather than imported from a shared fetch helper —
// per this repo's SRP-per-folder convention, each component folder is an
// independent module (same reasoning as
// PaymentActivationScreen/hooks.ts's own copy of this helper).
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

export type UseMembershipSubscriptionOptions = {
  // Skip the fetch entirely while the modal/screen isn't showing anything
  // that needs it (e.g. a closed dialog) — same idiom as TanStack Query's
  // own `enabled` option, just re-exported here for callers that don't want
  // to reach into query internals directly.
  enabled?: boolean;
  // Polling cadence while awaiting a webhook confirmation (see
  // AWAITING_CONFIRMATION_POLL_INTERVAL_MS in consts.ts). `undefined`/`false`
  // disables polling — the default, since most reads (PaymentActivationScreen,
  // UpgradeMembershipButton's trigger) only need a one-shot fetch.
  refetchIntervalMs?: number | false;
};

// Reads the caller's own club's membership subscription snapshot. Shared
// across every consumer (PaymentActivationScreen, UpgradeMembershipButton,
// and this modal itself) via one TanStack Query key so they read from a
// single cached fetch when mounted together — same reasoning already
// established for CLUB_PLAN_QUERY_KEY / MERCADOPAGO_STATUS_QUERY_KEY.
//
// A 404 (no subscription row yet) resolves to `null` instead of throwing —
// callers treat "no subscription" the same as "not yet paid", both showing
// the same "select a plan" step (see utils.ts's `resolveServerStep`).
export function useMembershipSubscription(
  options: UseMembershipSubscriptionOptions = {},
) {
  return useQuery({
    queryKey: MEMBERSHIP_SUBSCRIPTION_QUERY_KEY,
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchIntervalMs ?? false,
    queryFn: async () => {
      const res = await fetch("/api/clubs/membership");
      if (res.status === 404) return null;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? "Something went wrong. Please try again.",
        );
      }
      const data = (await res.json()) as {
        subscription: MembershipSubscriptionResponse;
      };
      return data.subscription;
    },
  });
}

export type InitiateMembershipCheckoutInput = {
  plan: Plan;
  cycle: MembershipCycleValue;
  renewalMode?: MembershipRenewalModeValue;
  payerEmail?: string;
  cardTokenId?: string;
};

export type InitiateMembershipCheckoutResult = {
  subscription: MembershipSubscriptionResponse;
  mpPreapprovalId?: string;
  checkoutUrl?: string;
};

// Initiates a membership checkout — POST /api/clubs/membership (Phase 4).
// On success, invalidates the shared subscription query so every mounted
// consumer picks up the fresh (still-PENDING-until-webhook, or
// TRIALING-if-a-trial-just-started) snapshot immediately.
export function useInitiateMembershipCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InitiateMembershipCheckoutInput) =>
      fetchJson<InitiateMembershipCheckoutResult>("/api/clubs/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(
        MEMBERSHIP_SUBSCRIPTION_QUERY_KEY,
        data.subscription,
      );
    },
  });
}
