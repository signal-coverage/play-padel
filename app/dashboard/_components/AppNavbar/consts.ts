import {
  LayoutDashboard,
  LayoutGrid,
  CalendarClock,
  CalendarCheck,
  Settings2,
  Compass,
  Users,
  ScrollText,
  Search,
  Activity,
  ClipboardCheck,
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
  // When true, this item requires the viewer's UserProfile.isAdmin flag
  // (independent of `role`/`roles` above) — see getVisibleNavItems. `roles`
  // still gates which roles can even be considered; this narrows further.
  adminOnly?: boolean;
  // When true, this item is ALSO shown to an admin regardless of whether
  // their own `role` is in `roles` — see getVisibleNavItems. Opposite
  // semantics from `adminOnly`: that one narrows an already role-matched
  // item down to admins-only; this one widens an item's visibility to
  // include every admin, in addition to (never instead of) the normal
  // role-based match. An admin's own `role` is always "player" (admin is
  // layered additively on top of a player account — see
  // prisma/schema.prisma's UserProfile.isAdmin comment), so without this an
  // owner-only item like Club Settings would never reach an admin who isn't
  // also an owner.
  visibleToAdmin?: boolean;
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
    // Widening (not narrowing, see `visibleToAdmin`'s own comment above):
    // an admin sees this even though their own `role` is "player", never an
    // owner. `roles` stays exactly as before for the non-admin case.
    visibleToAdmin: true,
  },
  {
    // Global admin technical tooling now (see app/dashboard/audit-logs/
    // page.tsx's AdminOnlyGuard) — visible to any admin, regardless of role,
    // and hidden from every non-admin, including owners. `roles` lists both
    // so an admin with either role passes the role gate; `adminOnly` is
    // what actually restricts visibility (see getVisibleNavItems).
    title: "Audit Log",
    href: "/dashboard/audit-logs",
    icon: ScrollText,
    roles: ["owner", "player"],
    adminOnly: true,
  },
  {
    // Global admin support tool (see app/api/admin/search/route.ts and
    // app/dashboard/admin-search/page.tsx's AdminOnlyGuard) — same
    // adminOnly narrowing pattern as Audit Log directly above: visible to
    // any admin regardless of role, hidden from every non-admin including
    // owners.
    title: "Search",
    href: "/dashboard/admin-search",
    icon: Search,
    roles: ["owner", "player"],
    adminOnly: true,
  },
  {
    // Global admin observability tool (see app/api/admin/system-status/
    // route.ts and app/dashboard/admin-status/page.tsx's AdminOnlyGuard) —
    // same adminOnly narrowing pattern as Audit Log/Search directly above:
    // visible to any admin regardless of role, hidden from every non-admin
    // including owners.
    title: "System Status",
    href: "/dashboard/admin-status",
    icon: Activity,
    roles: ["owner", "player"],
    adminOnly: true,
  },
  {
    // Global admin approval queue (see app/api/admin/clubs/pending/route.ts
    // and app/dashboard/admin-approvals/page.tsx's AdminOnlyGuard) — same
    // adminOnly narrowing pattern as Audit Log/Search/System Status directly
    // above: visible to any admin regardless of role, hidden from every
    // non-admin including owners.
    title: "Approvals",
    href: "/dashboard/admin-approvals",
    icon: ClipboardCheck,
    roles: ["owner", "player"],
    adminOnly: true,
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
