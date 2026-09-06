import type { ReactNode } from "react";

// Mirrors lib/mercadopago/operationalStatus.ts's ClubOperationalCause and
// the wire shape returned by
// app/api/clubs/mercadopago/operational-status/route.ts. Kept as a local
// copy (not imported from the settings card's types.ts) per the SRP-per-folder
// convention — each component folder is an independent module.
export type ClubOperationalCause =
  "MP_NOT_CONNECTED" | "CLUB_INACTIVE" | "PENDING_APPROVAL";

export type ClubOperationalStatusResponse = {
  operational: boolean;
  cause: ClubOperationalCause | null;
};

export type ClubOperationalGateProps = {
  children: ReactNode;
};
