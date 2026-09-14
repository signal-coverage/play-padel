"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("DisconnectConfirmDialog");
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      cancelLabel={t("cancelLabel")}
      confirmLabel={t("confirmLabel")}
      pendingLabel={t("pendingLabel")}
      isPending={isSubmitting}
      onConfirm={onConfirm}
    />
  );
}
