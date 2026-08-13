"use client";

import type { ReactNode } from "react";
import { isSameMonth } from "date-fns";
import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { useAuth } from "@/hooks/use-auth";
import { HeroShell } from "../HeroShell";
import { StatPill } from "../StatPill";
import {
  getFavoriteCourt,
  getHoursPlayed,
  getMemberSinceLabel,
} from "../../utils";

export function PlayerHero({ className }: { className?: string }) {
  const { user } = useAuth();
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
    const hoursPlayed = getHoursPlayed(nonCancelled);
    children = (
      <>
        <StatPill label="Upcoming" value={String(upcoming.length)} />
        <StatPill label="This Month" value={String(thisMonth.length)} />
        <StatPill label="Favorite Court" value={favoriteCourt} />
        <StatPill label="Hours Played" value={`${hoursPlayed}h`} />
        {user?.createdAt && (
          <StatPill
            label="Member Since"
            value={getMemberSinceLabel(user.createdAt)}
          />
        )}
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
