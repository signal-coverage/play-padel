// Delays firing GET /api/admin/search until the user pauses typing for this
// long — keeps a debounced client from sending one request per keystroke
// (see hooks.ts's useDebouncedValue).
export const ADMIN_SEARCH_DEBOUNCE_MS = 300;
