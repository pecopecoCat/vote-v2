"use client";

import type { ReactNode } from "react";
import VoteCard, { type CurrentUser } from "./VoteCard";
import { VoteCardMasonryTile } from "./VoteCardList";
import AdCard from "./AdCard";
import RecommendedTags from "./RecommendedTags";
import CollectionCard from "./CollectionCard";
import type { CardActivity } from "../data/voteCardActivity";
import { resolveStableVoteCardId } from "../data/voteCards";
import { buildVoteCardProps } from "../lib/buildVoteCardProps";
import { resolveCardBackgroundUrl } from "../lib/resolveCardBackgroundUrl";
import type { TimelineItem } from "../lib/voteTimeline";

type VoteTimelineMasonryProps = {
  items: TimelineItem[];
  tagList: string[];
  activity: Record<string, CardActivity>;
  commentedCardIdSet: Set<string>;
  bookmarkedIds: Set<string>;
  currentUser: CurrentUser;
  onVote: (id: string, option: "A" | "B") => void;
  onMoreClick: (cardId: string) => void;
  onAddToCollectionClick?: (cardId: string) => void;
  /** 末尾に差し込む（無限スクロール用センチネル等） */
  trailing?: ReactNode;
};

export function VoteTimelineMasonry({
  items,
  tagList,
  activity,
  commentedCardIdSet,
  bookmarkedIds,
  currentUser,
  onVote,
  onMoreClick,
  onAddToCollectionClick,
  trailing,
}: VoteTimelineMasonryProps) {
  return (
    <>
      {items.map((item, idx) => {
        if (item.type === "vote") {
          const card = item.card;
          const cardId = resolveStableVoteCardId(card);
          const act = activity[cardId];
          return (
            <VoteCardMasonryTile key={`vote-${cardId}-${idx}`}>
              <VoteCard
                {...buildVoteCardProps({
                  card,
                  cardId,
                  activity: act,
                  currentUser,
                  surface: "participate",
                  backgroundImageUrl: resolveCardBackgroundUrl(card, cardId),
                  bookmarked: bookmarkedIds.has(cardId),
                  hasCommented: commentedCardIdSet.has(cardId),
                  onVote,
                  onMoreClick,
                  onAddToCollectionClick,
                })}
              />
            </VoteCardMasonryTile>
          );
        }
        if (item.type === "collection") {
          const { id, title, gradient } = item.collection;
          return (
            <VoteCardMasonryTile key={`col-${id}-${idx}`}>
              <CollectionCard
                id={id}
                title={title}
                gradient={gradient}
                titleVariant="blackBlock"
                href={`/collection/${id}`}
                feedTile
              />
            </VoteCardMasonryTile>
          );
        }
        if (item.type === "tags") {
          return (
            <VoteCardMasonryTile key={`tags-${idx}`} fullWidth>
              <RecommendedTags tags={tagList} className="!mx-0" />
            </VoteCardMasonryTile>
          );
        }
        if (item.type === "pr") {
          return (
            <VoteCardMasonryTile key={`pr-${idx}`} fullWidth>
              <AdCard
                brandName={item.banner.brandName}
                caption={item.banner.caption}
                imageUrl={item.banner.imageUrl}
                fallbackGradientClassName={item.banner.fallbackGradientClassName}
              />
            </VoteCardMasonryTile>
          );
        }
        return null;
      })}
      {trailing}
    </>
  );
}
