"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useIsClubOperational } from "../AppNavbar/hooks";
import { getVisibleNavItems } from "../AppNavbar/utils";
import { useCommandPaletteShortcut } from "./hooks";
import type { CommandPaletteProps } from "./types";

// Entries come from the same navItems source of truth (via
// getVisibleNavItems) as NavLinks and MobileBottomNav, so this can never
// drift into a second, inconsistent route list — including the
// non-operational-owner "Dashboard only" reduction.
export function CommandPalette({ role }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useCommandPaletteShortcut(setOpen);

  const isOperational = useIsClubOperational(role);
  const visibleItems = getVisibleNavItems(role, isOperational);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Palette"
      description="Jump to a page in the dashboard"
    >
      <CommandInput placeholder="Jump to a page..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {visibleItems.map((item) => (
            <CommandItem
              key={item.href}
              value={item.title}
              onSelect={() => handleSelect(item.href)}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.5} />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
