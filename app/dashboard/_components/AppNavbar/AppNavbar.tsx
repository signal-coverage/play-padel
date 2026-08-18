"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./components/NavLinks";
import { UserMenu } from "./components/UserMenu";
import { CommandPalette } from "../CommandPalette";

export function AppNavbar() {
  const { user } = useAuth();
  const role = user?.role ?? "player";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-4 md:px-6">
      <CommandPalette role={role} />

      <div className="flex min-w-0 items-center gap-8">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight"
        >
          <Image src="/logo.svg" alt="Play Padel" width={24} height={24} />
          <span className="hidden sm:inline">Play Padel</span>
        </Link>

        <NavLinks role={role} className="hidden min-w-0 min-[809px]:flex" />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle />
        <Button
          variant="outline"
          size="icon-lg"
          disabled
          title="Notifications — coming soon"
          className="hidden rounded-full sm:inline-flex"
        >
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
