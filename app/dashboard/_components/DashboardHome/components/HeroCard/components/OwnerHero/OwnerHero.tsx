"use client";

import {
  useActiveCourts,
  useDayReservations,
} from "@/app/dashboard/reservations/_components/ReservationsView/hooks";
import { HeroShell } from "../HeroShell";
import { StatPill } from "../StatPill";
import { getFavoriteCourt, getHoursPlayed } from "../../utils";

export function OwnerHero({ className }: { className?: string }) {
  const { data: reservations = [] } = useDayReservations(new Date());
  const { data: courts = [] } = useActiveCourts();

  const isEmpty = courts.length === 0;

  if (isEmpty) {
    return (
      <HeroShell
        className={className}
        href="/dashboard/courts"
        heading="Let's set up your club"
        subheading="Add your first court to start taking bookings."
        ctaLabel="Add a Court"
      />
    );
  }

  const active = reservations.filter((r) => r.status !== "CANCELLED");
  const cancelled = reservations.filter((r) => r.status === "CANCELLED");
  const busiestCourt = getFavoriteCourt(active);
  const hoursBooked = getHoursPlayed(active);

  return (
    <HeroShell
      className={className}
      href="/dashboard/reservations"
      heading="Your club today"
    >
      <StatPill label="Today's Bookings" value={String(active.length)} />
      <StatPill label="Active Courts" value={String(courts.length)} />
      <StatPill label="Cancelled Today" value={String(cancelled.length)} />
      <StatPill label="Busiest Court" value={busiestCourt} />
      <StatPill label="Hours Booked" value={`${hoursBooked}h`} />
    </HeroShell>
  );
}
