"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./components/NavLinks";
import { UserMenu } from "./components/UserMenu";

export function AppNavbar() {
  const { user } = useAuth();
  const role = user?.role ?? "player";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-2.5 md:px-6">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
        <Image src="/logo.svg" alt="Play Padel" width={24} height={24} />
        <span className="hidden font-semibold text-sm sm:inline">
          Play Padel
        </span>
      </Link>

      <NavLinks role={role} className="hidden min-w-0 md:flex" />

      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon-lg"
          disabled
          title="Notifications — coming soon"
        >
          <Bell className="h-4 w-4" />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
