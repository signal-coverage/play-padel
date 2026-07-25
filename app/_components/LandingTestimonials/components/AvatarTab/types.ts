import type { Testimonial } from "../../types";

export interface AvatarTabProps {
  testimonial: Testimonial;
  isActive: boolean;
  onClick: () => void;
}
