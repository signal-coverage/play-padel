import { CalendarClock } from "lucide-react";
import {
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function UpcomingListEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
      <EmptyMedia variant="icon" className="size-9 rounded-full">
        <CalendarClock className="size-5" />
      </EmptyMedia>
      <EmptyTitle>No upcoming reservations</EmptyTitle>
      <EmptyDescription className="text-xs">
        Booked courts will show up here.
      </EmptyDescription>
    </div>
  );
}
