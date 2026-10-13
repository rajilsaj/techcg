/** A viewer's vote on an item: 1 = up, -1 = down, 0 = none. */
export type VoteValue = -1 | 0 | 1;
export type VoteDirection = 1 | -1;

export function isVoteDirection(value: unknown): value is VoteDirection {
  return value === 1 || value === -1;
}

/**
 * Clicking the arrow you already chose removes your vote; clicking the other
 * one switches it. `delta` is the change to the item's points.
 */
export function voteChange(current: VoteValue, clicked: VoteDirection): { next: VoteValue; delta: number } {
  const next: VoteValue = current === clicked ? 0 : clicked;
  return { next, delta: next - current };
}
