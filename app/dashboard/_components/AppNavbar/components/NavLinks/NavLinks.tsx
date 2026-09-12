"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useVisibleNavLinks, useOverflowNav } from "../../hooks";
import type { VisibleNavLink } from "../../hooks";
import { partitionNavLinks } from "../../utils";
import { NavBadge } from "../NavBadge";
import { NavGroupMenu } from "../NavGroupMenu";
import type { NavLinksProps } from "./types";

export function NavLinks({ role, isAdmin = false, className }: NavLinksProps) {
  const visibleLinks = useVisibleNavLinks(role, isAdmin);
  const { items, adminItems } = partitionNavLinks(visibleLinks);
  // Dashboard (the only `essential` item today) always stays visible — it's
  // the one anchor a real overflow-nav never hides. Everything else is a
  // genuine overflow candidate, dynamically fitted by useOverflowNav rather
  // than a fixed CSS breakpoint (see that hook's own doc comment in
  // ../../hooks for why: a single breakpoint can only ever be tuned for one
  // specific role/item combination, and stops working the moment a
  // different combination needs more or less room).
  const essentialItems = items.filter((item) => item.essential);
  const overflowCandidates = items.filter((item) => !item.essential);
  const overflow = useOverflowNav(overflowCandidates.length);
  const shownItems = overflowCandidates.slice(0, overflow.visibleCount);
  const hiddenOverflowItems = overflowCandidates.slice(overflow.visibleCount);

  return (
    <nav className={cn("relative items-center gap-1", className)}>
      {essentialItems.map((item) => (
        <NavLinkPill key={item.href} item={item} />
      ))}

      {/* flex-1 makes this container absorb ALL of nav's leftover width
          (see AppNavbar.tsx's own comment on why that leftover width is
          now real and viewport-stable, not just "whatever's left of this
          container's own shrunk content"). Its children — the fitted
          items, AND "More" right after them below — are left-aligned
          (plain flex, no justify-around/between), so they sit flush
          together right after Dashboard, with any leftover space trailing
          AFTER "More" instead of pushing it away from them. Rendering
          "More" as an external sibling AFTER this box instead would put it
          at the BOX's right edge — flush against Admin, not next to the
          items it belongs with. Deliberately no overflow-hidden: an open
          More/Admin dropdown is position: absolute and needs to escape
          this box to be visible at all — computeVisibleCount's own
          arithmetic (which already reserves the trigger's width via the
          moreTriggerWidth parameter below) is what keeps this container's
          real content from overflowing its bounds in the first place, so
          nothing needs clipping as a safety net. */}
      <div
        ref={(el) => overflow.setContainerRef(el)}
        data-testid="nav-overflow-container"
        className="flex min-w-0 flex-1 items-center gap-1"
      >
        {shownItems.map((item, index) => (
          <NavLinkPill
            key={item.href}
            item={item}
            ref={(el) => overflow.setItemRef(index, el)}
          />
        ))}

        {hiddenOverflowItems.length > 0 && (
          <NavGroupMenu
            items={hiddenOverflowItems}
            active={hiddenOverflowItems.some((item) => item.active)}
            label="More"
            icon={MoreHorizontal}
          />
        )}
      </div>

      {/* Measurement-only clone of whichever items are CURRENTLY overflowed
          — never visible (visibility: hidden, out of flow, no pointer
          events, hidden from the a11y tree) but still really laid out, so
          useOverflowNav can learn an overflowed item's width without
          rendering it in the real, visible row. Deliberately does NOT also
          clone the already-shown items above (those are measured straight
          off their own real, visible instance instead, via the same
          setItemRef) — a second always-mounted copy of every item would
          duplicate their text in the DOM, which `getByText`-based
          assertions (unlike `getByRole`, which already respects
          aria-hidden) can't tell apart from the real one. Always includes a
          clone of the "More" trigger itself, though — its width must be
          known even on a render where nothing has overflowed yet, and
          "More" isn't a label any other query in this codebase depends on
          being singular. */}
      <div
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 left-0 flex items-center gap-1"
      >
        {hiddenOverflowItems.map((item, index) => (
          <NavLinkPill
            key={item.href}
            item={item}
            tabIndex={-1}
            ref={(el) => overflow.setItemRef(overflow.visibleCount + index, el)}
          />
        ))}
        <div
          ref={(el) => overflow.setMoreTriggerRef(el)}
          className="inline-flex"
        >
          <NavGroupMenu
            items={overflowCandidates}
            active={false}
            label="More"
            icon={MoreHorizontal}
          />
        </div>
      </div>

      {adminItems.length > 0 && (
        <NavGroupMenu
          items={adminItems}
          active={adminItems.some((item) => item.active)}
          label="Admin"
          icon={Shield}
        />
      )}
    </nav>
  );
}

const NavLinkPill = forwardRef<
  HTMLAnchorElement,
  { item: VisibleNavLink; tabIndex?: number }
>(function NavLinkPill({ item, tabIndex }, ref) {
  const { active, badge } = item;
  return (
    <Link
      ref={ref}
      href={item.href}
      tabIndex={tabIndex}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative isolate shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="desktop-nav-highlight"
          className="absolute inset-0 -z-10 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative inline-flex items-center">
        {item.title}
        {badge && <NavBadge label={badge} />}
      </span>
    </Link>
  );
});
