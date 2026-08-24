// Minimal mirror of ClubOperationalGate/types.ts's
// ClubOperationalStatusResponse (same wire shape, from
// app/api/clubs/mercadopago/operational-status/route.ts). Kept as an
// independent local copy per the SRP-per-folder convention. This folder only
// needs the `operational` flag — nav visibility doesn't depend on *why* a
// club is non-operational, only on whether it is.
export type ClubOperationalStatusResponse = {
  operational: boolean;
};
