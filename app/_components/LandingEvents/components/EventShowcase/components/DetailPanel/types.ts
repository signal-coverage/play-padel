import type { EventItem } from "../../types";

export interface DetailPanelProps {
  event: EventItem;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}
