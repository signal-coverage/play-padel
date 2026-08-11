import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/utils";
import { dayKey } from "../../utils";
import type { MarkedCalendarProps } from "./types";

export function MarkedCalendar({
  markers,
  month,
  onMonthChange,
}: MarkedCalendarProps) {
  return (
    <div className="flex flex-col gap-4">
      <Calendar
        mode="single"
        month={month}
        onMonthChange={onMonthChange}
        showOutsideDays={false}
        className="w-full"
        classNames={{
          month_caption: "flex h-8 min-w-0 items-center pr-20",
          caption_label: "truncate font-heading text-base font-bold",
          nav: "absolute top-0 right-0 flex h-8 items-center gap-2",
          button_previous:
            "size-8 rounded-full border border-border p-0 text-muted-foreground hover:bg-muted hover:text-foreground",
          button_next:
            "size-8 rounded-full border border-border p-0 text-muted-foreground hover:bg-muted hover:text-foreground",
          month_grid: "w-full border-collapse",
          weekdays: "flex w-full pb-2",
          weekday: "label-mono flex-1 text-center",
          week: "mt-0.5 flex w-full",
          day: "group/day relative flex-1 p-0 text-center",
        }}
        modifiers={{
          hasBooking: (date) => markers.get(dayKey(date)) === "green",
          onlyCancelled: (date) => markers.get(dayKey(date)) === "red",
        }}
        components={{
          DayButton: ({ className, modifiers, children, ...props }) => {
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
                  "mx-auto size-8 min-w-0 rounded-full text-sm font-normal hover:bg-muted",
                  modifiers.today &&
                    "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
              >
                {children}
                {marker && (
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-1 mx-auto size-1.5 rounded-full",
                      marker === "green" ? "bg-chart-2" : "bg-destructive",
                    )}
                  />
                )}
              </CalendarDayButton>
            );
          },
        }}
      />
      <Separator />
      <div className="flex gap-4 pt-4">
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-chart-2" /> Booked
        </span>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-destructive" /> Cancelled
        </span>
      </div>
    </div>
  );
}
