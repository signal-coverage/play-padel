"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClubSettingsView } from "../ClubSettingsView";
import { MercadoPagoConnectionCard } from "../MercadoPagoConnectionCard";
import { OperatingHoursSettingsCard } from "../OperatingHoursSettingsCard";
import { CLUB_SETTINGS_TABS, DEFAULT_CLUB_SETTINGS_TAB } from "./consts";
import type { ClubSettingsTabValue } from "./types";

// Icon+label tab bar built on top of this app's shadcn Tabs primitive.
//
// Two of the primitive's own compound `group-data-horizontal/tabs:` variant
// classes have higher CSS specificity than a plain override of the same
// property, so both had to be beaten with the matching compound variant
// instead — confirmed via direct DOM measurement (getBoundingClientRect),
// not just visual inspection, since the first two attempts at this looked
// right in isolation but weren't:
//   1. `group-data-horizontal/tabs:h-8` pins the LIST to a 32px height. This
//      icon+label trigger (with its own padding) is taller than 32px, so
//      without overriding it too the trigger — and anything anchored to its
//      bottom edge, including the underline below — visibly overflowed the
//      card's border. Beaten here with the matching
//      `group-data-horizontal/tabs:h-auto`.
//   2. `group-data-horizontal/tabs:after:bottom-[-5px]` position the
//      primitive's own built-in underline (the "line" variant's `after`
//      pseudo-element) 5px below the trigger. A plain `after:hidden`
//      (different specificity, unrelated property) does correctly suppress
//      it, though — that part only needed `display:none` to win outright.
//
// The underline itself is a real element (not that pseudo-element) sharing
// a `layoutId` across triggers, the same pattern NavLinks already uses for
// its active-pill highlight (see
// AppNavbar/components/NavLinks/NavLinks.tsx). Tabs is controlled
// (`value`/`onValueChange`) purely so this component knows which trigger to
// render the indicator under — Radix's own uncontrolled state would work
// fine otherwise.
export function ClubSettingsTabs() {
  const [activeTab, setActiveTab] = useState<ClubSettingsTabValue>(
    DEFAULT_CLUB_SETTINGS_TAB,
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as ClubSettingsTabValue)}
      className="h-full min-h-0"
    >
      <TabsList
        variant="line"
        className="w-full justify-start gap-1 rounded-xl border border-border bg-card shadow-sm group-data-horizontal/tabs:h-auto"
      >
        {CLUB_SETTINGS_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-auto flex-none flex-row items-center gap-2 rounded-lg px-5 py-2.5 text-muted-foreground after:hidden data-active:text-primary"
          >
            <tab.icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
            <span className="text-sm font-medium">{tab.label}</span>
            {tab.value === activeTab && (
              <motion.span
                layoutId="club-settings-tab-underline"
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent
        value="basic"
        className="mt-6 min-h-0 overflow-y-auto animate-in fade-in-0 duration-200"
      >
        <ClubSettingsView />
      </TabsContent>

      <TabsContent
        value="hours"
        className="mt-6 min-h-0 overflow-y-auto animate-in fade-in-0 duration-200"
      >
        <OperatingHoursSettingsCard />
      </TabsContent>

      <TabsContent
        value="mercadopago"
        className="mt-6 min-h-0 overflow-y-auto animate-in fade-in-0 duration-200"
      >
        <MercadoPagoConnectionCard />
      </TabsContent>
    </Tabs>
  );
}
