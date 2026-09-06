"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/utils";
import { useVisibleNavLinks } from "../../hooks";
import type { NavLinksProps } from "../NavLinks/types";

export function MobileBottomNav({
  role,
  isAdmin = false,
  className,
}: NavLinksProps) {
  const visibleItems = useVisibleNavLinks(role, isAdmin);

  return (
    <nav
      className={cn(
        "flex items-center justify-around border-t border-border bg-background py-1.5",
        className,
      )}
    >
      {visibleItems.map((item) => {
        const { active } = item;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative isolate flex min-h-11 min-w-0 flex-col items-center gap-0.5 rounded-sm px-3 py-1 text-[10px] leading-none font-medium transition-colors",
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
            <item.icon className="h-5 w-5" />
            <span className="max-w-16 truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
