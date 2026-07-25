"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { NotificationsPage } from "./_components/NotificationsPage";

export default function NotificationsSettingsPage() {
  const { hasPermission } = usePermission();

  if (!hasPermission("notifications.read")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <NotificationsPage />;
}
