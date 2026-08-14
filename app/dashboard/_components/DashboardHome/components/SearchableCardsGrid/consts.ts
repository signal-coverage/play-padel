import { HeroCard } from "../HeroCard";
import { SessionLoadCard } from "../SessionLoadCard";
import { UpcomingCard } from "../UpcomingCard";
import { WeeklyLoadCard } from "../WeeklyLoadCard";
import type { SearchableCardDefinition } from "./types";

export const SEARCHABLE_CARDS: SearchableCardDefinition[] = [
  { key: "courts", title: "Courts", Component: HeroCard },
  { key: "weeklyLoad", title: "Weekly Load", Component: WeeklyLoadCard },
  { key: "sessionLoad", title: "Session Load", Component: SessionLoadCard },
  { key: "upcoming", title: "Upcoming", Component: UpcomingCard },
];
