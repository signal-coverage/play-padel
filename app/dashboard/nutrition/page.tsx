"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { NutritionPage } from "./_components/NutritionPage/NutritionPage";

export default function NutritionRoute() {
  const { hasPermission } = usePermission();

  if (!hasPermission("nutrition.view")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <NutritionPage />;
}
