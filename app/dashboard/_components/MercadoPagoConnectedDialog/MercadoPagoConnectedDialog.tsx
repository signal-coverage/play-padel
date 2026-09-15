"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BankTransferAccountSettingsCard } from "@/app/dashboard/settings/club/_components/BankTransferAccountSettingsCard";
import type { MercadoPagoConnectedDialogProps } from "./types";

// Shown once, right after `?mpConnect=success` lands on the dashboard (see
// DashboardShell's query-param-consuming effect). By the time this renders,
// ClubOperationalGate has already unblocked the dashboard — Mercado Pago
// being connected already satisfies the "how does this club get paid"
// requirement on its own (see lib/mercadopago/operationalStatus.ts's
// `hasPayoutMethod`), so the embedded bank transfer form here is a pure,
// skippable bonus (`allowSkip`), never a blocker.
export function MercadoPagoConnectedDialog({
  open,
  onOpenChange,
}: MercadoPagoConnectedDialogProps) {
  const t = useTranslations("MercadoPagoConnectedDialog");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <BankTransferAccountSettingsCard
          submitLabel={t("submitLabel")}
          allowSkip
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
