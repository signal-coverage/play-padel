"use client";

import { subDays } from "date-fns";
import { useOwnerReservationSummary } from "../../../../hooks";
import { OWNER_UTILIZATION_RANGE_DAYS } from "../../consts";
import { getCancellationRate } from "../../utils";
import { Gauge } from "../Gauge";
import { OwnerUtilizationEmpty } from "../OwnerUtilizationEmpty";

export function OwnerUtilization() {
  const today = new Date();
  const from = subDays(today, OWNER_UTILIZATION_RANGE_DAYS - 1);
  const { data: days = [] } = useOwnerReservationSummary(from, today);
  const result = getCancellationRate(days);

  return !result ? (
    <OwnerUtilizationEmpty />
  ) : (
    <Gauge
      percentage={result.percentage}
      display={result.displayPercentage}
      band={result.band}
    />
  );
}
