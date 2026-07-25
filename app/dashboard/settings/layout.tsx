"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { useOrganization } from "@/core/organizations/hooks/use-organization";
import type { PermissionKey } from "@/core/permissions/types";

interface NavItem {
  label: string;
  href: string;
  permission: PermissionKey;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Plan",
    href: "/dashboard/settings/plan",
    permission: "organization.update",
  },
  {
    label: "Organization",
    href: "/dashboard/settings/organization",
    permission: "organization.read",
  },
  {
    label: "Users",
    href: "/dashboard/settings/users",
    permission: "users.read",
  },
  {
    label: "Roles & Permissions",
    href: "/dashboard/settings/roles",
    permission: "settings.manage",
  },
  {
    label: "Custom Roles",
    href: "/dashboard/settings/custom-roles",
    permission: "settings.manage",
  },
  {
    label: "Notifications",
    href: "/dashboard/settings/notifications",
    permission: "notifications.read",
  },
  {
    label: "Plugins",
    href: "/dashboard/settings/plugins",
    permission: "settings.manage",
  },
  {
    label: "Danger Zone",
    href: "/dashboard/settings/danger-zone",
    permission: "settings.manage",
    adminOnly: true,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasPermission } = usePermission();
  const { userProfile } = useOrganization();

  const isAdmin = userProfile?.roleId === "admin";

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return hasPermission(item.permission);
  });

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b pb-0">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                item.adminOnly
                  ? isActive
                    ? "border-destructive text-destructive"
                    : "border-transparent text-destructive/60 hover:text-destructive hover:border-destructive/40"
                  : isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </div>
  );
}
