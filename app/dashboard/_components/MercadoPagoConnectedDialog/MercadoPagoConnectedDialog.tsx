"use client";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mercado Pago connected!</DialogTitle>
          <DialogDescription>
            Players can now pay for reservations through your Mercado Pago
            account. You can also add your bank account details below to offer
            bank transfer as an alternative payment method — this is entirely
            optional.
          </DialogDescription>
        </DialogHeader>
        <BankTransferAccountSettingsCard
          submitLabel="Save and continue"
          allowSkip
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
