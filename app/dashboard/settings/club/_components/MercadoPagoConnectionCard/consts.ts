export const MERCADOPAGO_STATUS_QUERY_KEY = [
  "clubs",
  "mercadopago",
  "operational-status",
] as const;

// GET route (see app/api/clubs/mercadopago/connect/route.ts) that redirects
// the browser straight into the Mercado Pago OAuth authorization flow —
// a plain link, not a fetch call.
export const MERCADOPAGO_CONNECT_URL = "/api/clubs/mercadopago/connect";
