import type { VoteComment } from "../data/voteCardActivity";

export type CommentSortOrder = "trending" | "newest";

/** 急上昇スコア：リプライ +2、いいね +1 */
export function getCommentTrendingScore(comment: Pick<VoteComment, "replyCount" | "likeCount">): number {
  return (comment.replyCount ?? 0) * 2 + (comment.likeCount ?? 0);
}

export function sortTopLevelComments(comments: VoteComment[], order: CommentSortOrder): VoteComment[] {
  const copy = [...comments];
  if (order === "newest") {
    return copy.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }
  return copy.sort((a, b) => {
    const diff = getCommentTrendingScore(b) - getCommentTrendingScore(a);
    if (diff !== 0) return diff;
    return (b.date ?? "").localeCompare(a.date ?? "");
  });
}
