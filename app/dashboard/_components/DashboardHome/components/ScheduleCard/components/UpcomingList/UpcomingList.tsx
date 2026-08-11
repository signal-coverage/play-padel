import { Separator } from "@/components/ui/separator";
import type { UpcomingItem } from "../../types";
import { UpcomingListEmpty } from "../UpcomingListEmpty";
import { UpcomingListItems } from "../UpcomingListItems";

export function UpcomingList({ items }: { items: UpcomingItem[] }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <Separator orientation="vertical" />
      <div className="flex flex-1 flex-col gap-4 overflow-hidden pl-4">
        <h3 className="font-heading text-base font-bold">Upcoming</h3>
        {items.length === 0 ? (
          <UpcomingListEmpty />
        ) : (
          <UpcomingListItems items={items} />
        )}
      </div>
    </div>
  );
}
