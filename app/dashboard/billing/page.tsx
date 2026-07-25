"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { BillingPage } from "./_components/BillingPage";

export default function BillingRoute() {
  const { hasPermission } = usePermission();

  if (!hasPermission("billing.read")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <BillingPage />;
}
