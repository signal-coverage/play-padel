import { HeroCard } from "../HeroCard";
import { SessionLoadCard } from "../SessionLoadCard";
import { UpcomingCard } from "../UpcomingCard";
import { WeeklyLoadCard } from "../WeeklyLoadCard";
import type { SearchableCardDefinition } from "./types";

export const SEARCHABLE_CARDS: SearchableCardDefinition[] = [
  { key: "courts", Component: HeroCard },
  { key: "weeklyLoad", Component: WeeklyLoadCard },
  { key: "sessionLoad", Component: SessionLoadCard },
  { key: "upcoming", Component: UpcomingCard },
];
