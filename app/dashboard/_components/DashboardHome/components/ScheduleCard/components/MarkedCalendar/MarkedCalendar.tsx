import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { cn } from "@/lib/utils/utils";
import { dayKey } from "../../utils";
import type { MarkedCalendarProps } from "./types";

export function MarkedCalendar({ markers }: MarkedCalendarProps) {
  return (
    <Calendar
      mode="single"
      disableNavigation
      showOutsideDays={false}
      className="w-full min-w-75 max-w-75"
      classNames={{
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full",
        weekday:
          "flex-1 text-center text-[11px] font-medium text-muted-foreground",
        week: "mt-0.5 flex w-full",
        day: "group/day relative flex-1 p-0 text-center",
      }}
      modifiers={{
        hasBooking: (date) => markers.get(dayKey(date)) === "green",
        onlyCancelled: (date) => markers.get(dayKey(date)) === "red",
      }}
      components={{
        DayButton: ({ className, modifiers, ...props }) => {
          const marker = modifiers.hasBooking
            ? "green"
            : modifiers.onlyCancelled
              ? "red"
              : null;
          return (
            <CalendarDayButton
              {...props}
              modifiers={modifiers}
              className={cn(
                className,
                "mx-auto size-6 min-w-0 rounded-full text-[11px]",
                marker === "green" &&
                  "bg-chart-2 text-white hover:bg-chart-2 hover:text-white dark:hover:text-white",
                marker === "red" &&
                  "bg-destructive text-white hover:bg-destructive hover:text-white dark:hover:text-white",
                modifiers.today &&
                  "ring-2 ring-primary ring-offset-1 ring-offset-background",
              )}
            />
          );
        },
      }}
    />
  );
}
