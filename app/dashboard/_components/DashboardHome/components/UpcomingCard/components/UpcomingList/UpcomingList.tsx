import type { UpcomingItem } from "../../types";
import { UpcomingListEmpty } from "../UpcomingListEmpty";
import { UpcomingListItems } from "../UpcomingListItems";

/**
 * Bare items/empty-state switch — no heading or separator here, since
 * `UpcomingCard`'s own `CardTitle` ("Upcoming") already carries that role
 * now that this list lives in its own card instead of sharing a box with
 * the calendar.
 */
export function UpcomingList({ items }: { items: UpcomingItem[] }) {
  return items.length === 0 ? (
    <UpcomingListEmpty />
  ) : (
    <UpcomingListItems items={items} />
  );
}
