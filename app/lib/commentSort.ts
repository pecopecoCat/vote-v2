import type { VoteComment } from "../data/voteCardActivity";

export type CommentSortOrder = "trending" | "newest";

/** 急上昇スコア：リプライ +2、いいね +1 */
export function getCommentTrendingScore(comment: Pick<VoteComment, "replyCount" | "likeCount">): number {
  return (comment.replyCount ?? 0) * 2 + (comment.likeCount ?? 0);
}

/** リプライを parentId ごとにグループ化（日付昇順） */
export function groupRepliesByParentId(comments: VoteComment[]): Map<string, VoteComment[]> {
  const map = new Map<string, VoteComment[]>();
  for (const c of comments) {
    if (!c.parentId) continue;
    const list = map.get(c.parentId);
    if (list) list.push(c);
    else map.set(c.parentId, [c]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }
  return map;
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
