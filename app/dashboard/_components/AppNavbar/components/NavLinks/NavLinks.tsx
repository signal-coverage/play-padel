"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/utils";
import { useVisibleNavLinks } from "../../hooks";
import type { NavLinksProps } from "./types";

export function NavLinks({ role, isAdmin = false, className }: NavLinksProps) {
  const visibleItems = useVisibleNavLinks(role, isAdmin);

  return (
    <nav className={cn("items-center gap-1", className)}>
      {visibleItems.map((item) => {
        const { active } = item;
        return (
          <Link
            key={item.href}
            href={item.href}
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
            <span className="relative">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
