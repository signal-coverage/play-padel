"use client";

import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { SwitchAccountConfirmDialogProps } from "./types";

// Mercado Pago's OAuth authorize screen has no account picker we control:
// if the club owner's browser still has an active Mercado Pago session
// (likely, since they just connected one), continuing straight into
// MERCADOPAGO_CONNECT_URL silently reconnects the SAME account instead of
// letting them pick a different one. This dialog exists purely to tell the
// owner that before the redirect happens.
//
// Unlike DisconnectConfirmDialog, confirming here never calls a backend
// route — it's purely informational, and onConfirm just performs the same
// navigation the plain "Switch account" link used to do directly. There is
// nothing to wait on, so isPending is always false.
export function SwitchAccountConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: SwitchAccountConfirmDialogProps) {
  const t = useTranslations("SwitchAccountConfirmDialog");
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      cancelLabel={t("cancelLabel")}
      confirmLabel={t("confirmLabel")}
      pendingLabel={t("pendingLabel")}
      isPending={false}
      variant="default"
      onConfirm={onConfirm}
    />
  );
}
