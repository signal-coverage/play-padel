import {
  LayoutDashboard,
  LayoutGrid,
  CalendarClock,
  CalendarCheck,
  Settings2,
  Compass,
  Users,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { SystemRole } from "@/providers/auth-provider";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: SystemRole[];
  // When true, this item stays visible for an owner even while their club is
  // non-operational (see getVisibleNavItems in ./utils) — every other
  // owner-only page just renders the same ClubOperationalGate screen, so
  // only the item(s) that make sense to keep reachable in that state should
  // set this.
  essential?: boolean;
};

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["owner", "player"],
    essential: true,
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
    title: "Audit Log",
    href: "/dashboard/audit-logs",
    icon: ScrollText,
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
  {
    title: "Players",
    href: "/dashboard/players",
    icon: Users,
    roles: ["player"],
  },
];

// Intentionally identical to ClubOperationalGate/consts.ts's
// CLUB_OPERATIONAL_STATUS_QUERY_KEY (same endpoint, same shape). Using the
// same TanStack Query key lets this folder's fetch dedupe with the gate's
// when both are mounted together (an owner's dashboard renders AppNavbar and
// ClubOperationalGate as siblings — see DashboardShell.tsx) instead of
// firing two independent requests. Kept as a local copy, not imported across
// folders, per this repo's SRP-per-folder convention.
export const CLUB_OPERATIONAL_STATUS_QUERY_KEY = [
  "clubs",
  "mercadopago",
  "operational-status",
] as const;
