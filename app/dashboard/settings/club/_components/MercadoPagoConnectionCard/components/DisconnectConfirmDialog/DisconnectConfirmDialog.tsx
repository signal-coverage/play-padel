"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { DisconnectConfirmDialogProps } from "./types";

// Deliberately honest copy: Mercado Pago exposes no API to revoke a club's
// authorization from our side, so this dialog never claims to "revoke" or
// "disconnect on Mercado Pago" — only that this app stops using the stored
// tokens. See app/api/clubs/mercadopago/disconnect/route.ts for the
// local-only action this confirms.
export function DisconnectConfirmDialog({
  open,
  onOpenChange,
  isSubmitting,
  onConfirm,
}: DisconnectConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Unlink Mercado Pago?"
      description="This app will stop using your Mercado Pago connection immediately — players won't be able to pay for court reservations until you reconnect. This only unlinks it from this app; it doesn't change anything on your Mercado Pago account."
      cancelLabel="Keep connected"
      confirmLabel="Unlink"
      pendingLabel="Unlinking…"
      isPending={isSubmitting}
      onConfirm={onConfirm}
    />
  );
}
