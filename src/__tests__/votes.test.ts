import { describe, expect, it } from "vitest";
import { isVoteDirection, voteChange } from "@/lib/vote-change";

describe("voteChange", () => {
  it("adds a vote", () => {
    expect(voteChange(0, 1)).toEqual({ next: 1, delta: 1 });
    expect(voteChange(0, -1)).toEqual({ next: -1, delta: -1 });
  });
  it("removes a vote when the same arrow is clicked again", () => {
    expect(voteChange(1, 1)).toEqual({ next: 0, delta: -1 });
    expect(voteChange(-1, -1)).toEqual({ next: 0, delta: 1 });
  });
  it("switches a vote", () => {
    expect(voteChange(1, -1)).toEqual({ next: -1, delta: -2 });
    expect(voteChange(-1, 1)).toEqual({ next: 1, delta: 2 });
  });
  it("accepts only 1 and -1", () => {
    expect(isVoteDirection(1)).toBe(true);
    expect(isVoteDirection(-1)).toBe(true);
    expect(isVoteDirection(0)).toBe(false);
    expect(isVoteDirection("1")).toBe(false);
  });
});
