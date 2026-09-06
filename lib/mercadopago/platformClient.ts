import { MercadoPagoConfig } from "mercadopago";
import { requireEnv } from "@/lib/env";

// Distinct trust domain from `getClubMercadoPagoClient(clubId)`
// (clubMercadoPagoClient.ts): that one resolves a per-club OAuth-connected
// access token from `ClubMercadoPagoAccount` for RECEIVING reservation
// payments. This module always builds a fresh client from the platform's
// OWN static `MERCADOPAGO_ACCESS_TOKEN` env var — used for money flows that
// belong to the platform itself (club membership subscriptions/payments),
// never a club's token. See design.md's "MP client for membership" decision.

/** Builds a Mercado Pago SDK client config from the platform's own access token. */
export function getPlatformMercadoPagoClient(): MercadoPagoConfig {
  return new MercadoPagoConfig({
    accessToken: requireEnv("MERCADOPAGO_ACCESS_TOKEN"),
  });
}
