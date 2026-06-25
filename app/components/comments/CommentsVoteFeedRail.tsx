"use client";

import type { ReactNode } from "react";

type CommentsVoteFeedRailProps = {
  children: ReactNode;
};

/** 関連VOTE：1回だけマウントし、SP=中央下 / PC=右サイドバーに CSS で配置 */
export function CommentsVoteFeedRail({ children }: CommentsVoteFeedRailProps) {
  return (
    <aside className="comments-page__vote-feed-rail min-w-0" aria-label="関連VOTE">
      <div className="comments-page__vote-feed-rail-inner">
        <h2 className="comments-page__vote-feed-rail-title mb-3 px-1 text-sm font-bold text-[#787878]">
          関連VOTE
        </h2>
        {children}
      </div>
    </aside>
  );
}
