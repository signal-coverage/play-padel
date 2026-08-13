"use client";

import { useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { useOwnerReservationSummary } from "../../../../hooks";
import { buildMarkersFromSummary } from "../../utils";
import { MarkedCalendar } from "../MarkedCalendar";

export function OwnerSchedule() {
  const today = new Date();
  const [month, setMonth] = useState(() => today);
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const { data: days = [] } = useOwnerReservationSummary(monthStart, monthEnd);
  const markers = buildMarkersFromSummary(days);

  return (
    <MarkedCalendar markers={markers} month={month} onMonthChange={setMonth} />
  );
}
