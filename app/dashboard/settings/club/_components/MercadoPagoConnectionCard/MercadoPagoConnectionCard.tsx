"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { mercadoPagoLogoLight, mercadoPagoLogoDark } from "@/assets/icons";
import { MERCADOPAGO_CONNECT_URL } from "./consts";
import { getMercadoPagoConnectionCopy } from "./utils";
import {
  useMercadoPagoOperationalStatus,
  useDisconnectMercadoPago,
} from "./hooks";
import { DisconnectConfirmDialog } from "./components/DisconnectConfirmDialog";
import { SwitchAccountConfirmDialog } from "./components/SwitchAccountConfirmDialog";

export function MercadoPagoConnectionCard() {
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [isSwitchAccountDialogOpen, setIsSwitchAccountDialogOpen] =
    useState(false);
  const { data: status, isLoading } = useMercadoPagoOperationalStatus();
  const disconnectMercadoPago = useDisconnectMercadoPago();
  const copy = getMercadoPagoConnectionCopy(status);
  const handleDisconnectDialogClose = useGuardedDialogClose(
    disconnectMercadoPago.isPending,
    () => setIsDisconnectDialogOpen(false),
  );

  async function handleConfirmDisconnect() {
    try {
      await disconnectMercadoPago.mutateAsync();
      toast.success("Mercado Pago unlinked.");
      setIsDisconnectDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not unlink Mercado Pago.",
      );
    }
  }

  // No mutation to await here — SwitchAccountConfirmDialog is purely
  // informational, so confirming just performs the same navigation the
  // plain "Switch account" link used to do directly.
  function handleConfirmSwitchAccount() {
    window.location.href = MERCADOPAGO_CONNECT_URL;
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="gap-4">
        <CardTitle className="flex items-center gap-2">
          <Image
            src={mercadoPagoLogoLight.default}
            alt="Mercado Pago"
            width={200}
            height={80}
            className="h-15 w-auto dark:hidden"
          />
          <Image
            src={mercadoPagoLogoDark.default}
            alt="Mercado Pago"
            width={200}
            height={80}
            className="hidden h-15 w-auto dark:block"
          />
          {isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <div className="flex flex-col items-start gap-1">
              <Badge variant={copy.badgeVariant}>{copy.badgeLabel}</Badge>
              {copy.accountLabel && (
                <span className="text-sm text-muted-foreground">
                  Account: {copy.accountLabel}
                </span>
              )}
            </div>
          )}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        {copy.showDisconnect ? (
          // The owner already has an account linked, so this CTA reads
          // "Switch account" — clicking it must warn about the MP OAuth
          // screen silently continuing with the current browser session
          // before navigating, instead of linking straight out.
          <Button
            type="button"
            disabled={isLoading}
            onClick={() => setIsSwitchAccountDialogOpen(true)}
          >
            {copy.ctaLabel}
          </Button>
        ) : (
          <Button asChild disabled={isLoading}>
            <a href={MERCADOPAGO_CONNECT_URL}>{copy.ctaLabel}</a>
          </Button>
        )}
        {copy.showDisconnect && (
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => setIsDisconnectDialogOpen(true)}
          >
            Unlink
          </Button>
        )}
      </CardFooter>
      <DisconnectConfirmDialog
        open={isDisconnectDialogOpen}
        onOpenChange={handleDisconnectDialogClose}
        isSubmitting={disconnectMercadoPago.isPending}
        onConfirm={handleConfirmDisconnect}
      />
      <SwitchAccountConfirmDialog
        open={isSwitchAccountDialogOpen}
        onOpenChange={setIsSwitchAccountDialogOpen}
        onConfirm={handleConfirmSwitchAccount}
      />
    </Card>
  );
}
