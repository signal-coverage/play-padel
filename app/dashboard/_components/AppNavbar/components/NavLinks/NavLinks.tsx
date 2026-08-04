"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/utils";
import { navItems } from "../../consts";
import type { NavLinksProps } from "./types";

export function NavLinks({ role, className }: NavLinksProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav
      className={cn(
        "flex items-center gap-1 overflow-x-auto rounded-full bg-muted p-1",
        className,
      )}
    >
      {visibleItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="active-nav-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              />
            )}
            <item.icon className="relative z-10 h-4 w-4" />
            <span className="relative z-10">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
