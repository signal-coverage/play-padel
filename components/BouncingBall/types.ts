import type { TennisBallIconProps } from "@/components/TennisBallIcon/TennisBallIcon";

export type BouncingBallProps = TennisBallIconProps & {
  // How high the ball rises each bounce, in px. Scale this to the ball's
  // own `size` — GlobalLoadingOverlay's large centered ball and a toast's
  // small inline icon shouldn't travel the same distance, or the small one
  // reads as flying off rather than bouncing in place.
  amplitude?: number;
};
