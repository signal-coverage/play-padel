import type { PermissionKey } from "@/core/permissions/types";
import {
  LayoutDashboard,
  Users,
  Activity,
  Calendar,
  CreditCard,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  requiredPermission?: PermissionKey;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "Patients",
    href: "/dashboard/patients",
    icon: Users,
    requiredPermission: "patients.read",
  },
  {
    title: "Professionals",
    href: "/dashboard/professionals",
    icon: Activity,
    requiredPermission: "professionals.read",
  },
  {
    title: "Appointments",
    href: "/dashboard/appointments",
    icon: Calendar,
    requiredPermission: "appointments.read",
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    requiredPermission: "billing.read",
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    requiredPermission: "billing.read",
  },
  {
    title: "Audit Log",
    href: "/dashboard/settings/audit",
    icon: ClipboardList,
    requiredPermission: "settings.manage",
  },
  {
    title: "Custom Roles",
    href: "/dashboard/settings/custom-roles",
    icon: ShieldCheck,
    requiredPermission: "settings.manage",
  },
];
