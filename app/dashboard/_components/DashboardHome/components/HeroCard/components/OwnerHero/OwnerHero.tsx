"use client";

import { useTranslations } from "next-intl";
import {
  useActiveCourts,
  useDayReservations,
} from "@/app/dashboard/reservations/_components/ReservationsView/hooks";
import { HeroShell } from "../HeroShell";
import { StatPill } from "../StatPill";
import { getFavoriteCourt, getHoursPlayed } from "../../utils";

export function OwnerHero({ className }: { className?: string }) {
  const t = useTranslations("OwnerHero");
  const { data: reservations = [] } = useDayReservations(new Date());
  const { data: courts = [] } = useActiveCourts();

  const isEmpty = courts.length === 0;

  if (isEmpty) {
    return (
      <HeroShell
        className={className}
        href="/dashboard/courts"
        heading={t("emptyHeading")}
        subheading={t("emptySubheading")}
        ctaLabel={t("addCourt")}
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
      heading={t("heading")}
    >
      <StatPill label={t("todaysBookings")} value={String(active.length)} />
      <StatPill label={t("activeCourts")} value={String(courts.length)} />
      <StatPill label={t("cancelledToday")} value={String(cancelled.length)} />
      <StatPill label={t("busiestCourt")} value={busiestCourt} />
      <StatPill label={t("hoursBooked")} value={`${hoursBooked}h`} />
    </HeroShell>
  );
}
