"use client";

import { useMemo } from "react";
import { useSharedData } from "../context/SharedDataContext";
import { isCommentAuthoredByCurrentUser } from "../data/voteCardActivity";
import { useAuthState } from "./useAuthState";

/** activity 全体から「自分がコメントした cardId」の Set を導出 */
export function useCommentedCardIdSet() {
  const { activity } = useSharedData();
  const auth = useAuthState();
  const isLoggedIn = auth.isLoggedIn;
  const displayName = auth.user?.name;

  return useMemo(() => {
    const set = new Set<string>();
    for (const [cid, a] of Object.entries(activity)) {
      if (
        (a.comments ?? []).some((c) =>
          isCommentAuthoredByCurrentUser(c.user?.name, { isLoggedIn, displayName })
        )
      ) {
        set.add(cid);
      }
    }
    return set;
  }, [activity, isLoggedIn, displayName]);
}
