"use client";

import {
  useActiveCourts,
  useDayReservations,
} from "@/app/dashboard/reservations/_components/ReservationsView/hooks";
import { HeroShell } from "../HeroShell";
import { StatPill } from "../StatPill";

export function OwnerHero({ className }: { className?: string }) {
  const { data: reservations = [] } = useDayReservations(new Date());
  const { data: courts = [] } = useActiveCourts();

  const active = reservations.filter((r) => r.status !== "CANCELLED");
  const cancelled = reservations.filter((r) => r.status === "CANCELLED");

  return (
    <HeroShell
      className={className}
      href="/dashboard/reservations"
      heading="Your club today"
    >
      <StatPill label="Today's Bookings" value={String(active.length)} />
      <StatPill label="Active Courts" value={String(courts.length)} />
      <StatPill label="Cancelled Today" value={String(cancelled.length)} />
    </HeroShell>
  );
}
