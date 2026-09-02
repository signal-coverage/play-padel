// A real bounce isn't symmetric: gravity decelerates the ball on the way up
// (easeOut — it visibly slows near the peak) and accelerates it back down
// (easeIn — fastest right before impact). A single easing for both halves
// reads as mechanical rather than physical.
export const BALL_TRANSITION = {
  duration: 0.65,
  repeat: Infinity,
  ease: ["easeOut", "easeIn"] as ["easeOut", "easeIn"],
};

// Squash at ground contact (impact flattens it), relaxed/round at the peak
// (near-zero velocity there) — the classic squash-and-stretch cue that
// sells a bounce as a real object hitting a surface, not just a shape
// sliding up and down.
export const BALL_SCALE_X = [1.2, 1, 1.2];
export const BALL_SCALE_Y = [0.8, 1, 0.8];
