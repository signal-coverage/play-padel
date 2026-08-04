import type { ComponentType } from "react";
import type { SystemRole } from "@/providers/auth-provider";

export type CardProps = { role: SystemRole; className?: string };

export type SearchableCardDefinition = {
  key: string;
  title: string;
  Component: ComponentType<CardProps>;
};

export type SearchableCardsGridProps = {
  role: SystemRole;
  query: string;
};
