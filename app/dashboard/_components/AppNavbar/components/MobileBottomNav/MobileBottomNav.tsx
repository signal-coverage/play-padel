"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { navItems } from "../../consts";
import type { NavLinksProps } from "../NavLinks/types";

export function MobileBottomNav({ role, className }: NavLinksProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav
      className={cn(
        "flex items-center justify-around border-t border-border bg-background py-1.5",
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
              "flex min-w-0 flex-col items-center gap-0.5 px-2 py-1 text-[10px] leading-none font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="max-w-16 truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
