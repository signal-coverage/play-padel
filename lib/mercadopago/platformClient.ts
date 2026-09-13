import { MercadoPagoConfig } from "mercadopago";
import { requireEnv } from "@/lib/env";

// Distinct trust domain from `getClubMercadoPagoClient(clubId)`
// (clubMercadoPagoClient.ts): that one resolves a per-club OAuth-connected
// access token from `ClubMercadoPagoAccount` for RECEIVING reservation
// payments. This module always builds a fresh client from the platform's
// OWN static `MERCADOPAGO_ACCESS_TOKEN` env var — used for money flows that
// belong to the platform itself (club membership subscriptions/payments),
// never a club's token. See design.md's "MP client for membership" decision.

// Bounded request timeout + retry budget for this client. The installed SDK
// otherwise defaults to a 60s per-attempt timeout with up to 3 retries and
// exponential backoff (see `mercadopago`'s `AppConfig.DEFAULT_TIMEOUT` /
// `DEFAULT_RETRIES`) — on a partial Mercado Pago outage that lets a single
// call hang for 60-150+ seconds, far past what an interactive request (a
// user creating/paying a membership preapproval) should ever wait. This
// client is used from both membership-preapproval creation (interactive,
// user-facing) and platform preference creation; both are on a user's
// critical path, so one conservative shared budget covers both rather than
// threading a per-context config through every call site.
export const PLATFORM_CLIENT_TIMEOUT_MS = 5000;
export const PLATFORM_CLIENT_MAX_RETRIES = 1;

/** Builds a Mercado Pago SDK client config from the platform's own access token. */
export function getPlatformMercadoPagoClient(): MercadoPagoConfig {
  return new MercadoPagoConfig({
    accessToken: requireEnv("MERCADOPAGO_ACCESS_TOKEN"),
    options: {
      timeout: PLATFORM_CLIENT_TIMEOUT_MS,
      maxRetries: PLATFORM_CLIENT_MAX_RETRIES,
    },
  });
}
