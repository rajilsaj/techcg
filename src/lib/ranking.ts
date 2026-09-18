// Gravity constants - tune these to adjust ranking
export const GRAVITY_CONSTANT = 1.8;
export const AGE_OFFSET_HOURS = 2;

export function calculateRankScore(points: number, createdAt: Date): number {
  const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const numerator = points - 1;
  const denominator = Math.pow(ageInHours + AGE_OFFSET_HOURS, GRAVITY_CONSTANT);

  return numerator / denominator;
}

export function getAgeInHours(createdAt: Date): number {
  return (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
}
