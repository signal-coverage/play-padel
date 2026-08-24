"use client";

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
import { MERCADOPAGO_CONNECT_URL } from "./consts";
import { getMercadoPagoConnectionCopy } from "./utils";
import { useMercadoPagoOperationalStatus } from "./hooks";

export function MercadoPagoConnectionCard() {
  const { data: status, isLoading } = useMercadoPagoOperationalStatus();
  const copy = getMercadoPagoConnectionCopy(status);

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Mercado Pago
          {isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <Badge variant={copy.badgeVariant}>{copy.badgeLabel}</Badge>
          )}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild disabled={isLoading}>
          <a href={MERCADOPAGO_CONNECT_URL}>{copy.ctaLabel}</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
