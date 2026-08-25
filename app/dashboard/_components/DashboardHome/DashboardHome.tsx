"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { SearchInput } from "@/components/SearchInput";
import { UpgradeMembershipButton } from "@/components/UpgradeMembershipButton";
import { tennisBall, tennisCourt } from "@/assets/icons";
import { SearchableCardsGrid } from "./components/SearchableCardsGrid";
import { PlayerOverviewCard } from "./components/PlayerOverview/PlayerOverviewCard";
import { PlayerOverviewBanner } from "./components/PlayerOverview/PlayerOverviewBanner";
import { Separator } from "@/components/ui/separator";
import { DashboardLoader } from "@/app/dashboard/_components/DashboardLoader";

export function DashboardHome() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");

  if (loading || !user || !user.role) return <DashboardLoader />;

  const name = user.displayName ?? user.email ?? "";
  const role = user.role;

  return (
    <div className="flex flex-col gap-3 md:h-full w-full">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
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
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search cards…"
            className="w-full"
          />
          {role === "owner" && <UpgradeMembershipButton />}
        </div>
      </div>

      {role === "player" ? (
        <div className="flex w-full flex-col gap-3 md:min-h-0 md:flex-1 md:flex-row md:gap-4">
          <SearchableCardsGrid
            role={role}
            query={query}
            onClearSearch={() => setQuery("")}
            className="min-w-0 md:flex-1 md:basis-0"
          />
          <Separator orientation={isMobile ? "horizontal" : "vertical"} />
          {isMobile ? (
            <PlayerOverviewBanner />
          ) : (
            <PlayerOverviewCard className="md:w-70 md:shrink-0" />
          )}
        </div>
      ) : (
        <SearchableCardsGrid
          role={role}
          query={query}
          onClearSearch={() => setQuery("")}
        />
      )}
    </div>
  );
}
