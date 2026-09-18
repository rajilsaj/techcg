import { CommentNode } from "@/lib/thread";
import { CommentItem } from "./CommentItem";

export interface CommentThreadProps {
  comments: CommentNode[];
  depth?: number;
}

export function CommentThread({ comments, depth = 0 }: CommentThreadProps) {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div>
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} depth={depth} />
      ))}
    </div>
  );
}
