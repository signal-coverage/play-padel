export type DayNavigatorProps = {
  date: Date;
  onDateChange?: (date: Date) => void;
  /** When given, "Previous day" is disabled once `date` is already on this calendar day (time-of-day is ignored) — never restricts "Next day". Omit for unrestricted navigation (e.g. an owner browsing historical reservations). */
  minDate?: Date;
};
