import type { UpcomingItem } from "../../types";
import { UpcomingListEmpty } from "../UpcomingListEmpty";
import { UpcomingListItems } from "../UpcomingListItems";

export function UpcomingList({ items }: { items: UpcomingItem[] }) {
  return items.length === 0 ? (
    <UpcomingListEmpty />
  ) : (
    <UpcomingListItems items={items} />
  );
}
