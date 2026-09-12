"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { NavGroupMenuProps } from "./types";

/**
 * Collapses a set of NavItems (see NavItem.group's own comment in
 * ../../consts.ts — currently just "admin"; the "More" grouping is dynamic
 * overflow instead, see useOverflowNav in ../../hooks) into one trigger
 * instead of each getting its own top-level pill/tab.
 *
 * Deliberately NOT built on the shared Radix DropdownMenu (the pattern
 * UserMenu uses) — this repo has twice already hit the same Radix
 * pointer-event/jsdom unreliability under plain `fireEvent` (see
 * CategoryTabs choosing Button toggles over Radix Tabs, and GroupBuilder
 * choosing a native `<select>` over Radix Select), so this menu uses a
 * plain controlled disclosure instead: fully reliable under `fireEvent`,
 * at the cost of Radix's focus-trap/animation polish — including having to
 * hand-roll Escape-to-close/refocus ourselves below, since Radix's own
 * DismissableLayer would normally give that for free.
 */
export function NavGroupMenu({
  items,
  active,
  label,
  icon: Icon,
  variant = "desktop",
}: NavGroupMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDownOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    // Standard menu-button keyboard convention (matches Radix's own
    // DropdownMenu, which this component otherwise deliberately avoids —
    // see the doc comment above): Escape closes it AND returns focus to
    // the trigger, rather than leaving focus stranded on whatever menuitem
    // it was last on (or nowhere, if focus never entered the menu at all).
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          variant === "desktop"
            ? "relative isolate flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium outline-none transition-colors"
            : // Same fixed w-16 as MobileNavLink (see its own comment) — the
              // "More"/"Admin" trigger is just another tab in the same row
              // and must match the rest for the row to look consistent.
              "relative isolate flex min-h-11 w-16 shrink-0 flex-col items-center gap-0.5 rounded-sm py-1 text-[10px] leading-none font-medium outline-none transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {variant === "mobile" && Icon && <Icon className="h-5 w-5" />}
        <span
          className={variant === "mobile" ? "max-w-16 truncate" : undefined}
        >
          {label}
        </span>
        {variant === "desktop" && <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-52 rounded-sm bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
            variant === "mobile"
              ? "bottom-full left-1/2 mb-2 -translate-x-1/2"
              : "top-full left-0 mt-1",
          )}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              aria-current={item.active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="flex cursor-pointer items-center gap-1.5 rounded-sm px-1.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={1.5}
              />
              {item.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
