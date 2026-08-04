"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HeroCard } from "../HeroCard";
import { SkillOverviewCard } from "../SkillOverviewCard";
import { SessionLoadCard } from "../SessionLoadCard";
import { ProgressGoalsCard } from "../ProgressGoalsCard";
import { ScheduleCard } from "../ScheduleCard";
import { ScrollHintBadge } from "./components/ScrollHintBadge";
import { useScrollAffordance } from "./hooks";
import { SEARCHABLE_CARDS } from "./consts";
import type { SearchableCardsGridProps } from "./types";

export function SearchableCardsGrid({ role, query }: SearchableCardsGridProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0;
  const matches = SEARCHABLE_CARDS.filter((card) =>
    card.title.toLowerCase().includes(normalizedQuery),
  );

  const [filteredScrollRef, filteredCanScrollMore] =
    useScrollAffordance<HTMLDivElement>();
  const [bentoScrollRef, bentoCanScrollMore] =
    useScrollAffordance<HTMLDivElement>();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isFiltering ? (
        matches.length > 0 ? (
          <motion.div
            key="filtered"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative md:min-h-0 md:flex-1"
          >
            <div
              ref={filteredScrollRef}
              className="grid h-full auto-rows-min grid-cols-1 content-start gap-3 overflow-y-auto sm:grid-cols-2 md:scrollbar-none lg:grid-cols-3 lg:gap-4"
            >
              <AnimatePresence mode="popLayout">
                {matches.map(({ key, Component }) => (
                  <motion.div
                    key={key}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Component role={role} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {filteredCanScrollMore && <ScrollHintBadge />}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center py-8 text-sm text-muted-foreground lg:flex-1"
          >
            No cards match &ldquo;{query}&rdquo;.
          </motion.div>
        )
      ) : (
        <motion.div
          key="bento"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="relative md:min-h-0 md:flex-1"
        >
          <div
            ref={bentoScrollRef}
            className="grid h-full grid-cols-1 gap-3 md:auto-rows-[minmax(max-content,auto)] md:overflow-y-auto md:scrollbar-none min-[1300px]:grid-cols-3 min-[1300px]:grid-rows-[minmax(max-content,1fr)_minmax(max-content,1fr)] min-[1300px]:gap-4"
          >
            <HeroCard role={role} className="min-[1300px]:col-span-2" />
            <SkillOverviewCard role={role} />
            <div className="flex min-h-0 flex-row gap-3 min-[1300px]:flex-col min-[1300px]:gap-4">
              <SessionLoadCard
                role={role}
                className="min-w-0 flex-1 min-[1300px]:min-h-52"
              />
              <ProgressGoalsCard
                role={role}
                className="min-w-0 flex-1 min-[1300px]:min-h-0"
              />
            </div>
            <ScheduleCard role={role} className="min-[1300px]:col-span-2" />
          </div>
          {bentoCanScrollMore && <ScrollHintBadge />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
