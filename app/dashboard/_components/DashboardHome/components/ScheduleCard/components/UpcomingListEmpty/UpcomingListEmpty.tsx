import { CalendarX2 } from "lucide-react";
import {
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function UpcomingListEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 border-l p-4 text-center">
      <EmptyMedia variant="icon">
        <CalendarX2 />
      </EmptyMedia>
      <EmptyTitle>No upcoming reservations</EmptyTitle>
      <EmptyDescription className="text-xs">
        Booked courts will show up here.
      </EmptyDescription>
    </div>
  );
}
