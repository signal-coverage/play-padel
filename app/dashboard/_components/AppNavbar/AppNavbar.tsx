"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { NavLinks } from "./components/NavLinks";
import { NotificationsBell } from "./components/NotificationsBell";
import { UserMenu } from "./components/UserMenu";
import { CommandPalette } from "../CommandPalette";

export function AppNavbar() {
  const { user } = useAuth();
  const role = user?.role ?? "player";
  const isAdmin = user?.isAdmin ?? false;
  const { resolvedTheme } = useTheme();
  const logoSrc =
    resolvedTheme === "dark" ? "/dark/logo.png" : "/light/logo.svg";

  return (
    // grid-cols-3 (three EQUAL tracks), not flex justify-between — this is
    // what actually centers NavLinks in the header regardless of how wide
    // the logo or the icon cluster are (in either language: Spanish nav
    // labels run longer than English ones, so anything that centered
    // relative to leftover flex space instead of a fixed, equal track would
    // drift per locale). The middle track's width is real and
    // viewport-stable by construction (exactly 1/3 of the header), which is
    // also what NavLinks' own internal nav-overflow-container (see
    // hooks.ts's useOverflowNav) needs to claim via ITS OWN flex-1 — see
    // AppNavbar.test.tsx.
    <header className="grid grid-cols-3 items-center gap-4 border-b border-border bg-background px-6 py-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <CommandPalette role={role} />
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight"
        >
          <Image src={logoSrc} alt="Play Padel" width={24} height={24} />
          <span className="hidden sm:inline">Play Padel</span>
        </Link>
      </div>

      {/* min-w-0 here is load-bearing, not cosmetic — a grid item's default
          min-width is auto (its own content's intrinsic width), which would
          let this column blow past the grid-cols-3 track's real 1/3 bound
          instead of actually being constrained to it. NavLinks' own flex-1
          below then fills exactly that bounded width, the same "real,
          viewport-stable space to claim" property the overflow measurement
          needs (see the header comment above) — just sourced from a grid
          track now instead of a flex-1 chain. */}
      <div className="flex min-w-0 items-center justify-center">
        <NavLinks
          role={role}
          isAdmin={isAdmin}
          className="hidden min-w-0 flex-1 min-[809px]:flex"
        />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3">
        <LocaleSwitcher />
        <ThemeToggle />
        <NotificationsBell />
        <UserMenu />
      </div>
    </header>
  );
}
