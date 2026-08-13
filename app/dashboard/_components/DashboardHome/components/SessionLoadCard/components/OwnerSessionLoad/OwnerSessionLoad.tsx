"use client";

import { subDays } from "date-fns";
import { useOwnerReservationSummary } from "../../../../hooks";
import { OWNER_SESSION_RANGE_DAYS } from "../../consts";
import { buildTrend, getGaugeTone } from "../../utils";
import { SessionLoadGauge } from "../SessionLoadGauge";

// Lower cancellation rates are healthier: <=5% is good, <=15% needs
// watching, anything above that needs attention.
const CANCELLATION_TONE_THRESHOLDS = { good: 5, watch: 15 };

export function OwnerSessionLoad() {
  const today = new Date();
  const currentFrom = subDays(today, OWNER_SESSION_RANGE_DAYS - 1);
  const previousTo = subDays(currentFrom, 1);
  const previousFrom = subDays(previousTo, OWNER_SESSION_RANGE_DAYS - 1);

  const { data: currentDays = [] } = useOwnerReservationSummary(
    currentFrom,
    today,
  );
  const { data: previousDays = [] } = useOwnerReservationSummary(
    previousFrom,
    previousTo,
  );

  const currentTotal = currentDays.reduce((sum, day) => sum + day.total, 0);
  const currentCancelled = currentDays.reduce(
    (sum, day) => sum + day.cancelled,
    0,
  );
  const previousTotal = previousDays.reduce((sum, day) => sum + day.total, 0);
  const previousCancelled = previousDays.reduce(
    (sum, day) => sum + day.cancelled,
    0,
  );

  const percent =
    currentTotal > 0 ? Math.round((currentCancelled / currentTotal) * 100) : 0;
  const previousPercent =
    previousTotal > 0 ? (previousCancelled / previousTotal) * 100 : null;

  const tone = getGaugeTone(percent, CANCELLATION_TONE_THRESHOLDS, true);
  const trend = buildTrend(percent, previousPercent);

  return (
    <SessionLoadGauge
      percent={percent}
      tone={tone}
      caption={`${percent}% of bookings cancelled`}
      trend={trend}
      hasData={currentTotal > 0}
      emptyMessage="Once bookings come in, we'll show your cancellation rate here."
    />
  );
}
