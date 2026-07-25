import type { EventItem } from "../../types";

export interface StackSlotProps {
  event: EventItem;
  isOpen: boolean;
  onClick: () => void;
}
