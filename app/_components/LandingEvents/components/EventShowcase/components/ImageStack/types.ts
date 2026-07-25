import type { EventItem } from "../../types";

export interface ImageStackProps {
  events: EventItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}
