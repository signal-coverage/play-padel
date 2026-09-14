"use client";

import type { ReactNode } from "react";
import { isSameMonth } from "date-fns";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("PlayerHero");
  const { user } = useAuth();
  const { data: upcoming = [] } = useMyReservations(false);
  const { data: history = [] } = useMyReservations(true);

  const isEmpty = upcoming.length === 0;

  const heading = isEmpty ? t("emptyHeading") : t("readyHeading");
  const subheading = isEmpty ? t("emptySubheading") : undefined;
  const ctaLabel = isEmpty ? t("browseCourts") : undefined;

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
        <StatPill label={t("upcoming")} value={String(upcoming.length)} />
        <StatPill label={t("thisMonth")} value={String(thisMonth.length)} />
        <StatPill label={t("favoriteCourt")} value={favoriteCourt} />
        <StatPill label={t("hoursPlayed")} value={`${hoursPlayed}h`} />
        {user?.createdAt && (
          <StatPill
            label={t("memberSince")}
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
