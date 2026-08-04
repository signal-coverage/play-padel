import { format } from "date-fns";
import { groupUpcomingByDay } from "../../utils";
import type { UpcomingItem } from "../../types";

export function UpcomingListItems({ items }: { items: UpcomingItem[] }) {
  const groups = groupUpcomingByDay(items);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto border-l">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          <div className="flex flex-col">
            {group.items.map((item, index) => (
              <div key={item.id} className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  {index < group.items.length - 1 && (
                    <span className="w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pb-2.5 text-xs">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {item.courtName}
                    </span>
                    <span className="text-muted-foreground">
                      {format(item.scheduledStart, "HH:mm")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
