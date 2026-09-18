import { describe, it, expect } from "vitest";
import { calculateRankScore, getAgeInHours, GRAVITY_CONSTANT, AGE_OFFSET_HOURS } from "@/lib/ranking";

describe("ranking formula", () => {
  it("should calculate rank score correctly", () => {
    const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const points = 10;

    const score = calculateRankScore(points, createdAt);

    // (10 - 1) / (2 + 2)^1.8 = 9 / 4^1.8 ≈ 9 / 12.13 ≈ 0.74
    expect(score).toBeGreaterThan(0.7);
    expect(score).toBeLessThan(0.8);
  });

  it("should give higher scores to newer items with same points", () => {
    const points = 10;
    const now = Date.now();
    const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

    const score1 = calculateRankScore(points, oneHourAgo);
    const score2 = calculateRankScore(points, twoHoursAgo);

    expect(score1).toBeGreaterThan(score2);
  });

  it("should give higher scores to items with more points", () => {
    const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const score10 = calculateRankScore(10, createdAt);
    const score100 = calculateRankScore(100, createdAt);

    expect(score100).toBeGreaterThan(score10);
  });

  it("should handle very old items gracefully", () => {
    const createdAt = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    const points = 100;

    const score = calculateRankScore(points, createdAt);

    expect(score).toBeGreaterThan(0);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("should calculate age in hours correctly", () => {
    const now = Date.now();
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

    const ageInHours = getAgeInHours(twoHoursAgo);

    expect(ageInHours).toBeCloseTo(2, 0);
  });

  it("should apply gravity constant correctly", () => {
    const createdAt = new Date(Date.now() - (AGE_OFFSET_HOURS + 1) * 60 * 60 * 1000);
    const ageInHours = getAgeInHours(createdAt);

    expect(ageInHours).toBeCloseTo(AGE_OFFSET_HOURS + 1, 0);
    expect(GRAVITY_CONSTANT).toBe(1.8);
  });
});
