// Intentionally identical to MercadoPagoConnectionCard/consts.ts's
// MERCADOPAGO_STATUS_QUERY_KEY (same endpoint, same shape). Using the same
// TanStack Query key lets both components share one cached fetch when they
// happen to be mounted together (e.g. the settings page renders the card
// while the dashboard shell around it renders the gate) instead of firing
// two independent requests.
export const CLUB_OPERATIONAL_STATUS_QUERY_KEY = [
  "clubs",
  "mercadopago",
  "operational-status",
] as const;
