/**
 * Pure function to assemble a flat list of comments into a tree structure.
 * Relies on materialized path strings (e.g., "001.042.105") for efficient sorting.
 */

export interface CommentData {
  id: number;
  text: string | null;
  authorUsername: string;
  /** Gravatar URL (never the email itself). */
  authorAvatar?: string;
  points: number;
  createdAt: Date;
  depth: number;
  path: string;
}

export interface CommentNode extends CommentData {
  children: CommentNode[];
  isFlattened?: boolean; // True if depth > MAX_DEPTH and children are flattened
}

const MAX_NESTED_DEPTH = 8;

/**
 * Build a tree from flat list of comments.
 * Comments are already sorted by path (which respects hierarchical order).
 */
export function buildCommentTree(
  comments: CommentData[]
): CommentNode[] {
  if (comments.length === 0) return [];

  const nodeMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // Create nodes for all comments
  for (const comment of comments) {
    const node: CommentNode = {
      ...comment,
      children: [],
    };
    nodeMap.set(comment.path, node);
  }

  // Build parent-child relationships
  for (const comment of comments) {
    const node = nodeMap.get(comment.path)!;

    // Parent = path minus its last component. Stored paths start with the story's
    // own segments, so a comment whose parent isn't in the list is a top-level one.
    const parentPath = comment.path.split(".").slice(0, -1).join(".");
    const parent = nodeMap.get(parentPath);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Flatten deep branches (past MAX_NESTED_DEPTH)
  flattenDeepBranches(roots, 0);

  return roots;
}

function flattenDeepBranches(nodes: CommentNode[], depth: number): void {
  for (const node of nodes) {
    if (depth >= MAX_NESTED_DEPTH) {
      // Mark as flattened and don't recurse
      node.isFlattened = true;
      // Move all descendants to direct children (flatten)
      const allDescendants = collectAllDescendants(node.children);
      node.children = allDescendants;
    } else {
      flattenDeepBranches(node.children, depth + 1);
    }
  }
}

function collectAllDescendants(nodes: CommentNode[]): CommentNode[] {
  const result: CommentNode[] = [];
  for (const node of nodes) {
    result.push(node);
    result.push(...collectAllDescendants(node.children));
  }
  return result;
}

/**
 * Calculate visual indent level (depth with max cap for flattened branches)
 */
export function getDisplayDepth(node: CommentNode, parentDepth: number): number {
  return Math.min(parentDepth + 1, MAX_NESTED_DEPTH);
}
