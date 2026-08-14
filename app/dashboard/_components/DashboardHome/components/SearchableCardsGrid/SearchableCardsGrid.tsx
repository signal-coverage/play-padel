"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/utils";
import { HeroCard } from "../HeroCard";
import { SessionLoadCard } from "../SessionLoadCard";
import { UpcomingCard } from "../UpcomingCard";
import { WeeklyLoadCard } from "../WeeklyLoadCard";
import { ScrollHintBadge } from "./components/ScrollHintBadge";
import { useScrollAffordance } from "./hooks";
import { SEARCHABLE_CARDS } from "./consts";
import type { SearchableCardsGridProps } from "./types";

export function SearchableCardsGrid({
  role,
  query,
  className,
}: SearchableCardsGridProps) {
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
            className={cn("relative md:min-h-0 md:flex-1", className)}
          >
            <div
              ref={filteredScrollRef}
              className="grid h-full auto-rows-min grid-cols-1 content-start gap-4 overflow-y-auto sm:grid-cols-2 md:scrollbar-none lg:gap-5"
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
            <AnimatePresence>
              {filteredCanScrollMore && <ScrollHintBadge key="scroll-hint" />}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "flex items-center justify-center py-8 text-sm text-muted-foreground lg:flex-1",
              className,
            )}
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
          className={cn("relative @container md:min-h-0 md:flex-1", className)}
        >
          <div
            ref={bentoScrollRef}
            className="flex h-full flex-col gap-3 md:overflow-y-auto md:scrollbar-none"
          >
            <HeroCard role={role} className="shrink-0" />
            <div className="flex flex-1 flex-col gap-3 @min-[768px]:flex-row @min-[768px]:gap-4 min-[1155px]:grid min-[1155px]:min-h-0! min-[1155px]:grid-cols-2 min-[1155px]:grid-rows-2 min-[1155px]:gap-4">
              <div className="flex min-w-0 flex-col gap-3 @min-[768px]:flex-1 @min-[768px]:basis-0 min-[1155px]:contents">
                <WeeklyLoadCard
                  role={role}
                  className="min-h-56 flex-1 @min-[768px]:min-h-72 min-[1155px]:col-start-1! min-[1155px]:row-start-1! min-[1155px]:min-h-0!"
                />
                <SessionLoadCard
                  role={role}
                  className="min-h-56 flex-1 @min-[768px]:min-h-72 min-[1155px]:col-start-1! min-[1155px]:row-start-2! min-[1155px]:min-h-0!"
                />
              </div>
              <UpcomingCard
                role={role}
                className="min-w-0 min-h-80 @min-[768px]:min-h-0 @min-[768px]:flex-1 @min-[768px]:basis-0 min-[1155px]:col-start-2! min-[1155px]:row-start-1! min-[1155px]:row-span-2!"
              />
            </div>
          </div>
          <AnimatePresence>
            {bentoCanScrollMore && (
              <ScrollHintBadge
                key="scroll-hint"
                className="min-[1155px]:hidden!"
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
