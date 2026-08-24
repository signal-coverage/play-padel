// Intentionally identical to ClubSettingsView/hooks.ts's local
// CLUB_QUERY_KEY (same endpoint, same shape). Using the same TanStack Query
// key lets both features share one cached fetch when they happen to be
// mounted together (e.g. the settings page's club form and this dialog can
// both be present in the dashboard) instead of firing two independent
// requests — same reasoning as MERCADOPAGO_STATUS_QUERY_KEY being shared
// between MercadoPagoConnectionCard and ClubOperationalGate.
export const CLUB_PLAN_QUERY_KEY = ["clubs", "current"] as const;
