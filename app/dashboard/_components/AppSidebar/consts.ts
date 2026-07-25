import {
  LayoutDashboard,
  LayoutGrid,
  CalendarClock,
  CalendarCheck,
  Settings2,
  Compass,
  type LucideIcon,
} from "lucide-react";
import type { SystemRole } from "@/providers/auth-provider";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: SystemRole[];
};

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["owner", "player"],
  },
  {
    title: "Courts",
    href: "/dashboard/courts",
    icon: LayoutGrid,
    roles: ["owner"],
  },
  {
    title: "Reservations",
    href: "/dashboard/reservations",
    icon: CalendarClock,
    roles: ["owner"],
  },
  {
    title: "Club Settings",
    href: "/dashboard/settings/club",
    icon: Settings2,
    roles: ["owner"],
  },
  {
    title: "Browse Courts",
    href: "/dashboard/browse",
    icon: Compass,
    roles: ["player"],
  },
  {
    title: "My Reservations",
    href: "/dashboard/my-reservations",
    icon: CalendarCheck,
    roles: ["player"],
  },
];
