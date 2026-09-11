export type NavBadgeLabel = "new" | "open";

export type NavBadgeProps = {
  label: NavBadgeLabel;
  // "pill" (default) is a small text pill next to the item's title —
  // used by desktop NavLinks, which has room for it. "dot" renders a
  // compact absolute-positioned dot (matching NotificationsBell's unread
  // indicator) with the label kept accessible via sr-only text instead of
  // visible text — used by MobileBottomNav, whose icon+truncated-label
  // column has no room for a second text pill.
  variant?: "pill" | "dot";
  className?: string;
};
