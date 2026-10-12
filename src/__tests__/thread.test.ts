import { describe, expect, it } from "vitest";
import { buildCommentTree, type CommentData } from "@/lib/thread";

const comment = (id: number, path: string): CommentData => ({
  id,
  text: `c${id}`,
  authorUsername: "u",
  points: 1,
  createdAt: new Date(0),
  depth: path.split(".").length - 1,
  path,
});

describe("buildCommentTree", () => {
  it("keeps comments whose path starts with the story's segments", () => {
    const tree = buildCommentTree([comment(4, "000003.000003.133742"), comment(5, "000003.000003.200000")]);
    expect(tree.map((n) => n.id)).toEqual([4, 5]);
  });

  it("nests replies under their parent", () => {
    const tree = buildCommentTree([comment(1, "a"), comment(2, "a.b"), comment(3, "a.b.c")]);
    expect(tree).toHaveLength(1);
    expect(tree[0].children[0].id).toBe(2);
    expect(tree[0].children[0].children[0].id).toBe(3);
  });
});
