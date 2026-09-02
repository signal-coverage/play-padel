export const BACKDROP_TRANSITION = { duration: 0.15 } as const;

// The contact shadow shrinks and fades as the ball rises (further from the
// surface) and grows/darkens as it nears impact — reinforces the same
// height cue as the bounce itself. Animated on BouncingBall's own
// BALL_TRANSITION (imported where this is used) so it stays in lockstep
// with the ball rather than drifting out of sync with a second timing.
export const SHADOW_SCALE = [1, 0.55, 1];
export const SHADOW_OPACITY = [0.35, 0.12, 0.35];
