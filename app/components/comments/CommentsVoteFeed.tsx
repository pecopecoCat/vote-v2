"use client";

import { memo } from "react";
import { VoteCardList } from "../VoteCardList";
import { VoteTimelineMasonry } from "../VoteTimelineMasonry";
import type { CardActivity } from "../../data/voteCardActivity";
import type { VoteCardData } from "../../data/voteCards";
import type { CurrentUser } from "../VoteCard";
import type { TimelineItem } from "../../lib/voteTimeline";

export type CommentsVoteFeedProps = {
  items: TimelineItem[];
  tagList: string[];
  createdVotesForTimeline: VoteCardData[];
  activity: Record<string, CardActivity>;
  commentedCardIdSet: Set<string>;
  bookmarkedIds: Set<string>;
  currentUser: CurrentUser;
  isRemote?: boolean;
  recordBookmarkEvent?: (cardId: string) => void;
  onVote: (id: string, option: "A" | "B") => void;
  onMoreClick: (cardId: string) => void;
  onAddToCollectionClick?: (cardId: string) => void;
};

export const CommentsVoteFeed = memo(function CommentsVoteFeed({
  items,
  tagList,
  createdVotesForTimeline,
  activity,
  commentedCardIdSet,
  bookmarkedIds,
  currentUser,
  isRemote = false,
  recordBookmarkEvent,
  onVote,
  onMoreClick,
  onAddToCollectionClick,
}: CommentsVoteFeedProps) {
  return (
    <VoteCardList masonry>
      <VoteTimelineMasonry
        items={items}
        tagList={tagList}
        createdVotesForTimeline={createdVotesForTimeline}
        activity={activity}
        commentedCardIdSet={commentedCardIdSet}
        bookmarkedIds={bookmarkedIds}
        currentUser={currentUser}
        isRemote={isRemote}
        recordBookmarkEvent={recordBookmarkEvent}
        onVote={onVote}
        onMoreClick={onMoreClick}
        onAddToCollectionClick={onAddToCollectionClick}
      />
    </VoteCardList>
  );
});
