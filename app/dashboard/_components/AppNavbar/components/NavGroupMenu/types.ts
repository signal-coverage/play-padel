import type { LucideIcon } from "lucide-react";
import type { VisibleNavLink } from "../../hooks";

export type NavGroupMenuProps = {
  // The already-visible grouped items (see partitionNavLinks in
  // ../../utils, and useOverflowNav in ../../hooks for the dynamic "More"
  // case). NavLinks/MobileBottomNav's own VISIBLE trigger is only ever
  // rendered once there's at least one item — an empty array only ever
  // reaches this component via their hidden full-list measurement clone
  // (see useOverflowNav's own doc comment for why that clone must always
  // render, even with nothing currently overflowed).
  items: VisibleNavLink[];
  // Whether the current route matches any of `items` — highlights the
  // trigger itself the same way an individual pill highlights when active,
  // since none of the grouped items get their own visible trigger anymore.
  active: boolean;
  // Trigger label, e.g. "Admin" or "More".
  label: string;
  // Shown before `label` on the "mobile" variant only (desktop's pill has no
  // room/need for one) — omit for a group with no natural icon.
  icon?: LucideIcon;
  // "desktop" (default) matches NavLinks' rounded-full pill shell. "mobile"
  // matches MobileBottomNav's icon+truncated-label column shell — same
  // reasoning as NavBadge's own variant split.
  variant?: "desktop" | "mobile";
};
