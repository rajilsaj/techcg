"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { formatTime, pluralize } from "@/lib/utils";
import { CommentNode } from "@/lib/thread";
import { CommentThread } from "./CommentThread";

export interface CommentItemProps {
  comment: CommentNode;
  depth: number;
}

export function CommentItem({ comment, depth }: CommentItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = comment.children.length > 0;
  const indentLevel = Math.min(depth, 8);
  const indentPx = indentLevel * 24; // 24px per level

  return (
    <div style={{ marginLeft: `${indentPx}px` }} className="border-l border-border">
      <div className="px-4 py-3 border-b border-border hover:bg-bg-secondary transition-colors">
        {/* Comment header */}
        <div className="flex items-start gap-2 mb-2">
          {hasChildren && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex-shrink-0 p-0.5 hover:bg-border rounded transition-colors"
              aria-label={collapsed ? "Déplier le fil" : "Replier le fil"}
              title={`${comment.children.length} ${pluralize(comment.children.length, "réponse")}`}
            >
              {collapsed ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-text-secondary"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              ) : (
                <ChevronDown size={16} className="text-text-secondary" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs mb-1">
              <a
                href={`/user/${comment.authorUsername}`}
                className="font-medium text-text hover:underline"
              >
                {comment.authorUsername}
              </a>
              <span className="text-text-secondary">{comment.points} {pluralize(comment.points, "point")}</span>
              <span className="text-text-secondary">{formatTime(comment.createdAt)}</span>
            </div>

            <div className="text-sm text-text break-words whitespace-pre-wrap">
              {comment.text}
            </div>
          </div>
        </div>
      </div>

      {/* Children */}
      {!collapsed && comment.children.length > 0 && (
        <CommentThread comments={comment.children} depth={depth + 1} />
      )}

      {/* Collapse indicator */}
      {collapsed && comment.children.length > 0 && (
        <div className="px-4 py-2 text-xs text-text-secondary border-b border-border">
          {comment.children.length} {pluralize(comment.children.length, "réponse masquée", "réponses masquées")}
        </div>
      )}
    </div>
  );
}
