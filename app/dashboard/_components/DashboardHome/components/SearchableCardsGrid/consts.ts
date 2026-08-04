import { SkillOverviewCard } from "../SkillOverviewCard";
import { SessionLoadCard } from "../SessionLoadCard";
import { ProgressGoalsCard } from "../ProgressGoalsCard";
import { ScheduleCard } from "../ScheduleCard";
import type { SearchableCardDefinition } from "./types";

// HeroCard is excluded — it's a CTA banner with no title text, so it can
// never match a search term.
export const SEARCHABLE_CARDS: SearchableCardDefinition[] = [
  {
    key: "skillOverview",
    title: "Skill Overview",
    Component: SkillOverviewCard,
  },
  { key: "sessionLoad", title: "Session Load", Component: SessionLoadCard },
  {
    key: "progressGoals",
    title: "Progress & Goals",
    Component: ProgressGoalsCard,
  },
  { key: "schedule", title: "Schedule", Component: ScheduleCard },
];
