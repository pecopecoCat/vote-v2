"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getBookmarkIds, getBookmarksUpdatedEventName } from "../data/bookmarks";
import { getCurrentActivityUserId } from "../data/auth";
import { addHiddenCard } from "../data/hiddenCards";
import { addHiddenUser } from "../data/hiddenUsers";
import {
  buildAllVoteCards,
  getNewestVoteCards,
  getRelatedVoteCardsByTagPriority,
  recommendedTagList,
  type VoteCardData,
} from "../data/voteCards";
import { getTagsSimilarTo, getTrendingTagsFromCards } from "../data/search";
import { useSharedData } from "../context/SharedDataContext";
import { buildTimelineItems, getTimelineCollectionPool } from "../lib/voteTimeline";
import type { CommentsVoteFeedProps } from "../components/comments/CommentsVoteFeed";
import { useAuthState } from "./useAuthState";
import type { useCardModerationFlow } from "./useCardModerationFlow";
import { useCommentedCardIdSet } from "./useCommentedCardIdSet";
import { useCurrentUser } from "./useCurrentUser";
import { useLocalCollections } from "./useLocalCollections";

type ModerationFlow = ReturnType<typeof useCardModerationFlow>;

type UseCommentsVoteFeedOptions = {
  card: VoteCardData | null | undefined;
  cardId: string;
  moderation: ModerationFlow;
};

export function useCommentsVoteFeed({ card, cardId, moderation }: UseCommentsVoteFeedOptions) {
  const shared = useSharedData();
  const {
    createdVotesForTimeline,
    activity: sharedActivity,
    addVote: sharedAddVote,
    isRemote,
    recordBookmarkEvent,
  } = shared;
  const auth = useAuthState();
  const currentUser = useCurrentUser(auth);
  const commentedCardIdSet = useCommentedCardIdSet();
  const { collections } = useLocalCollections();

  const [relatedKeepVotedVisibleIds, setRelatedKeepVotedVisibleIds] = useState<Set<string>>(() => new Set());
  const [bookmarkRefreshKey, setBookmarkRefreshKey] = useState(0);

  useEffect(() => {
    setRelatedKeepVotedVisibleIds(new Set());
  }, [cardId]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        setRelatedKeepVotedVisibleIds(new Set());
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    const handler = () => setBookmarkRefreshKey((k) => k + 1);
    window.addEventListener(getBookmarksUpdatedEventName(), handler);
    return () => window.removeEventListener(getBookmarksUpdatedEventName(), handler);
  }, []);

  const allCards = useMemo(
    () => buildAllVoteCards(createdVotesForTimeline),
    [createdVotesForTimeline]
  );

  const bottomVoteCards = useMemo(() => {
    if (!card) return [] as VoteCardData[];

    const onlyUnvoted = (cards: VoteCardData[]) =>
      cards.filter((c) => {
        const cid = c.id ?? c.question;
        const voted = sharedActivity[cid]?.userSelectedOption != null;
        if (!voted) return true;
        return relatedKeepVotedVisibleIds.has(cid);
      });

    const related = onlyUnvoted(getRelatedVoteCardsByTagPriority(card, allCards, cardId, 10));
    const relatedSliced = related.slice(0, 10);

    if (relatedSliced.length === 0) {
      return onlyUnvoted(getNewestVoteCards(allCards, cardId, 30)).slice(0, 10);
    }

    if (relatedSliced.length < 10) {
      const excludeIds = new Set<string>([cardId]);
      for (const c of relatedSliced) {
        excludeIds.add(c.id ?? c.question);
      }
      const newest = onlyUnvoted(getNewestVoteCards(allCards, cardId, 40, excludeIds)).slice(0, 10);
      return [...relatedSliced, ...newest];
    }

    return relatedSliced;
  }, [card, allCards, cardId, sharedActivity, relatedKeepVotedVisibleIds]);

  const tagList = useMemo(() => {
    if (!card?.tags?.length) {
      const fromCards = getTrendingTagsFromCards(allCards).map((t) => t.tag).slice(0, 10);
      if (fromCards.length > 0) return fromCards;
      return [...recommendedTagList].slice(0, 10);
    }
    return getTagsSimilarTo(card.tags[0], allCards, 10);
  }, [card?.tags, allCards]);

  const timelinePool = useMemo(() => getTimelineCollectionPool(collections), [collections]);

  const bottomTimelineItems = useMemo(
    () => buildTimelineItems(bottomVoteCards, timelinePool),
    [bottomVoteCards, timelinePool]
  );

  const bookmarkedIds = useMemo(() => new Set(getBookmarkIds()), [bookmarkRefreshKey]);
  const activityUserId = typeof window !== "undefined" ? getCurrentActivityUserId() : "";

  const handleFeedVote = useCallback(
    (cid: string, option: "A" | "B") => {
      setRelatedKeepVotedVisibleIds((prev) => {
        const next = new Set(prev);
        next.add(cid);
        return next;
      });
      void sharedAddVote(cid, option);
    },
    [sharedAddVote]
  );

  const handleFeedMoreClick = useCallback(
    (targetCardId: string) => {
      const related = bottomVoteCards.find((c) => (c.id ?? c.question) === targetCardId);
      moderation.openCardOptions(targetCardId, related?.createdByUserId === activityUserId);
    },
    [bottomVoteCards, moderation, activityUserId]
  );

  const onHideFeedCard = useCallback(
    (cid: string) => {
      const target = cid === cardId ? card : allCards.find((c) => (c.id ?? c.question) === cid);
      if (target?.createdByUserId) addHiddenUser(target.createdByUserId);
      addHiddenCard(cid);
      moderation.closeCardOptions();
    },
    [card, cardId, allCards, moderation]
  );

  const feedProps: CommentsVoteFeedProps | null =
    bottomVoteCards.length > 0
      ? {
          items: bottomTimelineItems,
          tagList,
          createdVotesForTimeline,
          activity: sharedActivity,
          commentedCardIdSet,
          bookmarkedIds,
          currentUser,
          isRemote,
          recordBookmarkEvent,
          onVote: handleFeedVote,
          onMoreClick: handleFeedMoreClick,
          onAddToCollectionClick: moderation.openAddToCommunity,
        }
      : null;

  return {
    hasVoteFeed: bottomVoteCards.length > 0,
    feedProps,
    allCards,
    onHideFeedCard,
  };
}
