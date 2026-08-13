"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { navItems } from "../../consts";
import type { NavLinksProps } from "./types";

export function NavLinks({ role, className }: NavLinksProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav className={cn("items-center gap-6 overflow-x-auto", className)}>
      {visibleItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 text-sm font-medium transition-colors hover:text-foreground",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
