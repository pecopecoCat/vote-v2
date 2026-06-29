"use client";

import { useMemo } from "react";
import type { VoteComment } from "../data/voteCardActivity";
import { resolveCommentUserDisplay } from "../lib/resolveCommentUserDisplay";
import { useAuthState } from "./useAuthState";

/** コメント作者の表示名・アイコン（プロフィール更新後も追従） */
export function useCommentUserDisplay(comment: VoteComment) {
  const auth = useAuthState();
  return useMemo(
    () => resolveCommentUserDisplay(comment),
    [comment, auth.isLoggedIn, auth.user?.name, auth.user?.iconUrl, auth.userId]
  );
}
