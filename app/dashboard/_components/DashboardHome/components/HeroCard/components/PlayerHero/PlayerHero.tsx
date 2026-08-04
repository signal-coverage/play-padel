"use client";

import type { ReactNode } from "react";
import { isSameMonth } from "date-fns";
import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { HeroShell } from "../HeroShell";
import { StatPill } from "../StatPill";
import { getFavoriteCourt } from "../../utils";

export function PlayerHero({ className }: { className?: string }) {
  const { data: upcoming = [] } = useMyReservations(false);
  const { data: history = [] } = useMyReservations(true);

  const isEmpty = upcoming.length === 0;

  const heading = isEmpty
    ? "You don't have any matches booked yet"
    : "Ready for your next match?";
  const subheading = isEmpty
    ? "Find a court and lock in your first session."
    : undefined;
  const ctaLabel = isEmpty ? "Browse Courts" : undefined;

  let children: ReactNode;
  if (!isEmpty) {
    const nonCancelled = history.filter((r) => r.status !== "CANCELLED");
    const thisMonth = nonCancelled.filter((r) =>
      isSameMonth(r.scheduledStart, new Date()),
    );
    const favoriteCourt = getFavoriteCourt(nonCancelled);
    children = (
      <>
        <StatPill label="Upcoming" value={String(upcoming.length)} />
        <StatPill label="This Month" value={String(thisMonth.length)} />
        <StatPill label="Favorite Court" value={favoriteCourt} />
      </>
    );
  }

  return (
    <HeroShell
      className={className}
      href="/dashboard/browse"
      heading={heading}
      subheading={subheading}
      ctaLabel={ctaLabel}
    >
      {children}
    </HeroShell>
  );
}
