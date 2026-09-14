"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  useIsClubOperational,
  useOpenTournamentsStatus,
} from "../AppNavbar/hooks";
import { getVisibleNavItems } from "../AppNavbar/utils";
import { useCommandPaletteShortcut } from "./hooks";
import type { CommandPaletteProps } from "./types";

// Entries come from the same navItems source of truth (via
// getVisibleNavItems) as NavLinks and MobileBottomNav, so this can never
// drift into a second, inconsistent route list — including the
// non-operational-owner "Dashboard only" reduction and the Tournaments
// item's dynamic "at least one tournament is open" condition (reuses
// useOpenTournamentsStatus, the same hook the navbar itself calls, rather
// than duplicating its fetch logic — see AppNavbar/hooks.ts).
export function CommandPalette({ role }: CommandPaletteProps) {
  const t = useTranslations("CommandPalette");
  const tNav = useTranslations("AppNavbar.navItems");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useCommandPaletteShortcut(setOpen);

  const isOperational = useIsClubOperational(role);
  const { anyOpen: tournamentsOpen } = useOpenTournamentsStatus(role);
  const visibleItems = getVisibleNavItems(role, isOperational, false, {
    tournamentsOpen,
  });

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("title")}
      description={t("description")}
    >
      <CommandInput placeholder={t("placeholder")} />
      <CommandList>
        <CommandEmpty>{t("noResults")}</CommandEmpty>
        <CommandGroup heading={t("navigateGroup")}>
          {visibleItems.map((item) => (
            <CommandItem
              key={item.href}
              value={tNav(item.titleKey)}
              onSelect={() => handleSelect(item.href)}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.5} />
              {tNav(item.titleKey)}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
