"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tennisBall, tennisCourt } from "@/assets/icons";
import { SearchableCardsGrid } from "./components/SearchableCardsGrid";
import { PlayerOverviewCard } from "./components/PlayerOverview/PlayerOverviewCard";
import { PlayerOverviewBanner } from "./components/PlayerOverview/PlayerOverviewBanner";
import { Separator } from "@/components/ui/separator";

export function DashboardHome() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");

  if (loading || !user || !user.role) return null;

  const name = user.displayName ?? user.email ?? "";
  const role = user.role;

  return (
    <div className="flex flex-col gap-3 md:h-full">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          {role === "owner" ? (
            <Image
              src={tennisCourt.default}
              alt=""
              className="mr-2 inline-block h-4.5 w-4.5 align-middle"
            />
          ) : (
            <Image
              src={tennisBall.default}
              alt=""
              className="mr-2 inline-block h-4.5 w-4.5 align-middle"
            />
          )}
          Welcome{name && `, ${name}`}
        </h1>

        <div className="flex flex-1 items-center gap-2 max-w-208 lg:max-w-160">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cards…"
              className="w-full pl-8"
            />
          </div>
          {role === "owner" && (
            <Button asChild size="sm">
              <Link href="/dashboard/settings/club">
                <Sparkles className="h-4 w-4" />
                Upgrade
              </Link>
            </Button>
          )}
        </div>
      </div>

      {role === "player" ? (
        <div className="grid grid-cols-1 gap-3 md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,1fr)_auto_2fr] md:grid-rows-[minmax(0,1fr)] md:gap-4">
          {isMobile ? <PlayerOverviewBanner /> : <PlayerOverviewCard />}
          <Separator orientation={isMobile ? "horizontal" : "vertical"} />
          <SearchableCardsGrid role={role} query={query} />
        </div>
      ) : (
        <SearchableCardsGrid role={role} query={query} />
      )}
    </div>
  );
}
