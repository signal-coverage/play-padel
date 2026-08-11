import type { Marker } from "../../types";

export type MarkedCalendarProps = {
  markers: Map<string, Marker>;
  month: Date;
  onMonthChange: (month: Date) => void;
};
