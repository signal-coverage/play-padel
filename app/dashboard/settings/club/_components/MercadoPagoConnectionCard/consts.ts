export const MERCADOPAGO_STATUS_QUERY_KEY = [
  "clubs",
  "mercadopago",
  "operational-status",
] as const;

// GET route (see app/api/clubs/mercadopago/connect/route.ts) that redirects
// the browser straight into the Mercado Pago OAuth authorization flow —
// a plain link, not a fetch call.
export const MERCADOPAGO_CONNECT_URL = "/api/clubs/mercadopago/connect";

// POST route (see app/api/clubs/mercadopago/disconnect/route.ts) that
// unlinks the club's stored Mercado Pago tokens on our side. This is a
// fetch call (unlike MERCADOPAGO_CONNECT_URL), not a plain link — it's a
// local-only action, not a redirect into an OAuth flow.
export const MERCADOPAGO_DISCONNECT_URL = "/api/clubs/mercadopago/disconnect";
