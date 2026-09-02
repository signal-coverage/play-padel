export type BallProps = {
  // Position in the drop sequence — drives horizontal placement, stagger
  // delay, and per-ball fall-distance/rotation variation so the whole
  // group doesn't look like a perfect, robotic grid.
  index: number;
};
