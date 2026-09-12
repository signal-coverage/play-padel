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
import type { NavLinksProps } from "../NavLinks/types";

export function MobileBottomNav({
  role,
  isAdmin = false,
  className,
}: NavLinksProps) {
  const visibleLinks = useVisibleNavLinks(role, isAdmin);
  const { items, adminItems } = partitionNavLinks(visibleLinks);
  // Same dynamic-overflow approach as desktop NavLinks (see its own doc
  // comment, and useOverflowNav in ../../hooks) — mobile's row is at least
  // as tight, so a fixed set of always-flat tabs crowds just as easily.
  // Dashboard (the only `essential` item today) always stays visible.
  const essentialItems = items.filter((item) => item.essential);
  const overflowCandidates = items.filter((item) => !item.essential);
  const overflow = useOverflowNav(overflowCandidates.length);
  const shownItems = overflowCandidates.slice(0, overflow.visibleCount);
  const hiddenOverflowItems = overflowCandidates.slice(overflow.visibleCount);

  return (
    <nav
      className={cn(
        "relative flex items-center border-t border-border bg-background py-1.5",
        className,
      )}
    >
      {/* Dashboard, the fitted overflow candidates, AND the Admin trigger
          all live in this one row so a single justify-around spaces every
          visible tab evenly across the navbar — nesting them (Dashboard/
          Admin as separate flex siblings around a sub-container with its
          own internal justify-around) made the sub-container's own outer
          margins compete unevenly with Dashboard/Admin's, instead of every
          tab sharing one flat distribution. Deliberately no overflow-hidden
          (see useOverflowNav's setContainerRef comment) — Admin's dropdown
          needs to escape this box to be visible, same reasoning as the
          "More" dropdown bugfix below. */}
      <div
        ref={(el) => overflow.setContainerRef(el)}
        data-testid="nav-overflow-container"
        className="flex min-w-0 flex-1 items-center justify-around"
      >
        {essentialItems.map((item) => (
          <MobileNavLink
            key={item.href}
            item={item}
            ref={(el) => overflow.setEssentialRef(el)}
          />
        ))}

        {shownItems.map((item, index) => (
          <MobileNavLink
            key={item.href}
            item={item}
            ref={(el) => overflow.setItemRef(index, el)}
          />
        ))}

        {adminItems.length > 0 && (
          <div
            ref={(el) => overflow.setAdminTriggerRef(el)}
            className="inline-flex"
          >
            <NavGroupMenu
              items={adminItems}
              active={adminItems.some((item) => item.active)}
              label="Admin"
              icon={Shield}
              variant="mobile"
            />
          </div>
        )}
      </div>

      {/* The visible "More" trigger must NOT live inside the container
          above — its open menu is position: absolute and needs to escape
          that box (upward here) to actually be visible; nested inside an
          overflow-hidden ancestor (this container's old shape), it clipped
          away to nothing the moment it opened (jsdom doesn't compute real
          CSS clipping, so this shipped unnoticed by every test until an
          assertion checked for it — see this file's own test). As a
          shrink-0 sibling right after the measured container instead, its
          width still gets correctly reserved via setMoreTriggerRef below,
          same as Dashboard/Admin's widths are reserved from inside it. */}
      {hiddenOverflowItems.length > 0 && (
        <NavGroupMenu
          items={hiddenOverflowItems}
          active={hiddenOverflowItems.some((item) => item.active)}
          label="More"
          icon={MoreHorizontal}
          variant="mobile"
        />
      )}

      {/* Measurement-only clone of whichever items are CURRENTLY overflowed
          — see NavLinks.tsx's identical block for why only these (not the
          already-shown items) get cloned. */}
      <div
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 left-0 flex items-center"
      >
        {hiddenOverflowItems.map((item, index) => (
          <MobileNavLink
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
            variant="mobile"
          />
        </div>
      </div>
    </nav>
  );
}

const MobileNavLink = forwardRef<
  HTMLAnchorElement,
  { item: VisibleNavLink; tabIndex?: number }
>(function MobileNavLink({ item, tabIndex }, ref) {
  const { active, badge } = item;
  return (
    <Link
      ref={ref}
      href={item.href}
      tabIndex={tabIndex}
      aria-current={active ? "page" : undefined}
      className={cn(
        // Fixed w-16 (not min-w-0 + content-driven padding) so every tab —
        // "Dashboard", "Courts", the "More"/"Admin" NavGroupMenu trigger —
        // renders the same width regardless of label length; matches the
        // label span's own max-w-16 below, so truncation and column width
        // agree. shrink-0 keeps it from being squeezed by its overflow-nav
        // siblings once the row runs tight.
        "relative isolate flex min-h-11 w-16 shrink-0 flex-col items-center gap-0.5 rounded-sm py-1 text-[10px] leading-none font-medium transition-colors",
        active ? "text-primary-foreground" : "text-muted-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="mobile-nav-highlight"
          className="absolute inset-0 -z-10 rounded-sm bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative inline-flex">
        <item.icon className="h-5 w-5" />
        {/* Compact dot variant — no room next to a truncated mobile-width
            label for a text pill like desktop's; the "New"/"Open" label
            stays accessible via sr-only text (see NavBadge's own variant
            comment). */}
        {badge && <NavBadge label={badge} variant="dot" />}
      </span>
      <span className="max-w-16 truncate">{item.title}</span>
    </Link>
  );
});
