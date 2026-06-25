"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import AppHeader from "../../components/AppHeader";
import VoteCardMini from "../../components/VoteCardMini";
import { VoteCardList } from "../../components/VoteCardList";
import { VoteTimelineMasonry } from "../../components/VoteTimelineMasonry";
import CardModerationModals from "../../components/CardModerationModals";
import ReportViolationModal from "../../components/ReportViolationModal";
import { getCollectionById } from "../../data/collections";
import CommentSortSegment from "../../components/CommentSortSegment";
import { sortTopLevelComments, type CommentSortOrder } from "../../lib/commentSort";
import CommentThreadGroup from "../../components/CommentThreadGroup";
import Button from "../../components/Button";
import CommentInputModal from "../../components/CommentInputModal";
import CommentOptionsModal from "../../components/CommentOptionsModal";
import {
  voteCardsData,
  CARD_BACKGROUND_IMAGES,
  getRelatedVoteCardsByTagPriority,
  getNewestVoteCards,
  recommendedTagList,
} from "../../data/voteCards";
import {
  getTagsSimilarTo,
  getTrendingTagsFromCards,
} from "../../data/search";
import { getCollections } from "../../data/collections";
import {
  getMergedCounts,
  addCommentLike,
  getCommentIdsLikedByCurrentUser,
  isCommentAuthoredByCurrentUser,
  COMMENT_LIKES_BY_ME_UPDATED_EVENT,
  type VoteComment,
} from "../../data/voteCardActivity";
import { useSharedData } from "../../context/SharedDataContext";
import { isCardBookmarked, getBookmarksUpdatedEventName, getBookmarkIds } from "../../data/bookmarks";
import { getCurrentActivityUserId } from "../../data/auth";
import { addHiddenUser } from "../../data/hiddenUsers";
import { addHiddenCard } from "../../data/hiddenCards";
import type { VoteCardData } from "../../data/voteCards";
import { normalizeCardIdKey } from "../../lib/normalize";
import { resolveActivityForCard } from "../../data/voteCardActivity";
import { resolveVoteCardByStableId } from "../../lib/resolveVoteCardByStableId";
import { resolveCardBackgroundUrl } from "../../lib/resolveCardBackgroundUrl";
import { buildTimelineItems, getTimelineCollectionPool } from "../../lib/voteTimeline";
import { useAuthState } from "../../hooks/useAuthState";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useCardModerationFlow } from "../../hooks/useCardModerationFlow";

const emptyActivity = { countA: 0, countB: 0, comments: [] as VoteComment[], userSelectedOption: undefined as "A" | "B" | undefined };

export default function CommentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "0";
  const collectionIdFromUrl = (searchParams.get("collectionId") ?? "").trim();
  const stableId = useMemo(() => normalizeCardIdKey(id), [id]);
  const shared = useSharedData();
  const {
    createdVotesForTimeline,
    activity: sharedActivity,
    activityBootstrapDone,
    addVote: sharedAddVote,
    addComment: sharedAddComment,
    removeComment: sharedRemoveComment,
    isRemote,
    recordBookmarkEvent,
  } = shared;
  const activityRaw = useMemo(
    () => resolveActivityForCard(sharedActivity, stableId),
    [sharedActivity, stableId]
  );
  const activity = useMemo(() => {
    const list = Array.isArray(activityRaw.comments) ? activityRaw.comments : [];
    if (!collectionIdFromUrl) {
      // 通常コメントページは「コレクション内コメント」を混ぜない
      return {
        ...activityRaw,
        comments: list.filter((c) => (c as { collectionId?: unknown }).collectionId == null),
      };
    }
    return {
      ...activityRaw,
      comments: list.filter((c) => (c as { collectionId?: unknown }).collectionId === collectionIdFromUrl),
    };
  }, [activityRaw, collectionIdFromUrl]);
  const [sessionSelectedOption, setSessionSelectedOption] = useState<"A" | "B" | null>(null);

  const card = useMemo(
    () => resolveVoteCardByStableId(id, createdVotesForTimeline),
    [id, createdVotesForTimeline]
  );
  const auth = useAuthState();
  const currentUser = useCurrentUser(auth);
  const moderation = useCardModerationFlow();
  const [bookmarkRefreshKey, setBookmarkRefreshKey] = useState(0);
  const [commentReportCardId, setCommentReportCardId] = useState<string | null>(null);
  const [commentSortOrder, setCommentSortOrder] = useState<CommentSortOrder>("newest");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>(() => getCommentIdsLikedByCurrentUser(stableId));
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentMenuTarget, setCommentMenuTarget] = useState<VoteComment | null>(null);
  /**
   * 下部「関連VOTE／新着VOTE」：投票直後は一覧に残し、別ページ遷移やタブ復帰後に activity に合わせて非表示にする（HOME と同様）。
   */
  const [relatedKeepVotedVisibleIds, setRelatedKeepVotedVisibleIds] = useState<Set<string>>(() => new Set());
  const isLoggedIn = auth.isLoggedIn;
  const headerBookmarked = useMemo(
    () => isCardBookmarked(id),
    [id, bookmarkRefreshKey]
  );

  useEffect(() => {
    const handler = () => setBookmarkRefreshKey((k) => k + 1);
    window.addEventListener(getBookmarksUpdatedEventName(), handler);
    return () => window.removeEventListener(getBookmarksUpdatedEventName(), handler);
  }, []);
  const bookmarkedIds = useMemo(
    () => new Set(getBookmarkIds()),
    [bookmarkRefreshKey]
  );
  const memberCollectionFromUrl = useMemo(() => {
    if (!collectionIdFromUrl) return null;
    return getCollectionById(collectionIdFromUrl);
  }, [collectionIdFromUrl]);
  const isMemberCollectionComments =
    Boolean(collectionIdFromUrl) && memberCollectionFromUrl?.visibility === "member";
  const commentsDisabled = card?.commentsDisabled === true || isMemberCollectionComments;

  useEffect(() => {
    if (!isMemberCollectionComments || !collectionIdFromUrl) return;
    router.replace(`/collection/${encodeURIComponent(collectionIdFromUrl)}`);
  }, [isMemberCollectionComments, collectionIdFromUrl, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = `vote_last_selection_${stableId}`;
      const v = window.sessionStorage.getItem(key);
      if (v === "A" || v === "B") setSessionSelectedOption(v);
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [stableId]);

  const effectiveSelectedOption = activity.userSelectedOption ?? (sessionSelectedOption ?? undefined);
  const canPostByVote = effectiveSelectedOption != null;
  const canOpenPostModal = !commentsDisabled && (!isLoggedIn || canPostByVote);
  const canUseReplyAction = !commentsDisabled && isLoggedIn && canPostByVote;

  useEffect(() => {
    const handler = () => setLikedCommentIds(getCommentIdsLikedByCurrentUser(stableId));
    window.addEventListener(COMMENT_LIKES_BY_ME_UPDATED_EVENT, handler);
    return () => window.removeEventListener(COMMENT_LIKES_BY_ME_UPDATED_EVENT, handler);
  }, [stableId]);

  useEffect(() => {
    setRelatedKeepVotedVisibleIds(new Set());
  }, [id]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        setRelatedKeepVotedVisibleIds(new Set());
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const allCards = useMemo(() => {
    const seedWithId = voteCardsData.map((c, i) => ({ ...c, id: `seed-${i}` }));
    return [...createdVotesForTimeline, ...seedWithId];
  }, [createdVotesForTimeline]);

  /**
   * 下部一覧: 関連を最大10件。関連が1〜9件のときはその下に新着を10件（重複除外）。
   * 関連0件のときは新着のみ10件。
   */
  const { relatedBottomCards, newestBottomCards } = useMemo(() => {
    if (!card) {
      return { relatedBottomCards: [] as VoteCardData[], newestBottomCards: [] as VoteCardData[] };
    }
    const onlyUnvoted = (cards: VoteCardData[]) =>
      cards.filter((c) => {
        const cid = c.id ?? c.question;
        const voted = sharedActivity[cid]?.userSelectedOption != null;
        if (!voted) return true;
        return relatedKeepVotedVisibleIds.has(cid);
      });

    const related = onlyUnvoted(getRelatedVoteCardsByTagPriority(card, allCards, id, 10));
    const relatedSliced = related.slice(0, 10);

    if (relatedSliced.length === 0) {
      return {
        relatedBottomCards: [],
        newestBottomCards: onlyUnvoted(getNewestVoteCards(allCards, id, 30)).slice(0, 10),
      };
    }

    if (relatedSliced.length < 10) {
      const excludeIds = new Set<string>([id]);
      for (const c of relatedSliced) {
        excludeIds.add(c.id ?? c.question);
      }
      const newest = onlyUnvoted(getNewestVoteCards(allCards, id, 40, excludeIds)).slice(0, 10);
      return { relatedBottomCards: relatedSliced, newestBottomCards: newest };
    }

    return { relatedBottomCards: relatedSliced, newestBottomCards: [] as VoteCardData[] };
  }, [card, allCards, id, sharedActivity, relatedKeepVotedVisibleIds]);

  /** みんなのコメントページ：カードにタグあり→1個目に似たタグ10件、なし→カード由来の注目タグ or 固定おすすめ */
  const commentsPageTagList = useMemo(() => {
    if (!card?.tags?.length) {
      const fromCards = getTrendingTagsFromCards(allCards).map((t) => t.tag).slice(0, 10);
      if (fromCards.length > 0) return fromCards;
      return [...recommendedTagList].slice(0, 10);
    }
    return getTagsSimilarTo(card.tags[0], allCards, 10);
  }, [card?.tags, allCards]);

  /** みんなのコメントページ下部：関連＋新着を HOME と同じ差し込みルールで表示 */
  const bottomVoteCards = useMemo(
    () => [...relatedBottomCards, ...newestBottomCards],
    [relatedBottomCards, newestBottomCards]
  );

  const bottomTimelineItems = useMemo(() => {
    const pool = getTimelineCollectionPool(getCollections());
    return buildTimelineItems(bottomVoteCards, pool);
  }, [bottomVoteCards]);

  const commentedCardIds = useMemo(
    () =>
      Object.entries(sharedActivity)
        .filter(([, a]) =>
          (a.comments ?? []).some((c) =>
            isCommentAuthoredByCurrentUser(c.user?.name, {
              isLoggedIn,
              displayName: auth.user?.name,
            })
          )
        )
        .map(([cid]) => cid),
    [sharedActivity, isLoggedIn, auth.user?.name]
  );

  const commentedCardIdSet = useMemo(() => new Set(commentedCardIds), [commentedCardIds]);

  const backgroundUrl = card ? resolveCardBackgroundUrl(card, id) : CARD_BACKGROUND_IMAGES[0];
  const merged = card ? getMergedCounts(card.countA ?? 0, card.countB ?? 0, card.commentCount ?? 0, activity) : { countA: 0, countB: 0, commentCount: 0 };
  const activityUserId = typeof window !== "undefined" ? getCurrentActivityUserId() : "";

  const handleVote = (side: "A" | "B") => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(`vote_last_selection_${stableId}`, side);
      } catch {
        /* ignore */
      }
    }
    void sharedAddVote(stableId, side);
  };

  const handleCommentSubmit = (
    cardId: string,
    payload: { user: { name: string; iconUrl?: string }; text: string },
    parentCommentId?: string
  ) => {
    const commenterVote = effectiveSelectedOption;
    void sharedAddComment(
      cardId,
      payload,
      parentCommentId,
      commenterVote,
      collectionIdFromUrl || undefined
    ).then(() =>
      setReplyingToCommentId(null)
    );
  };

  const waitingForCreatedCard =
    id.startsWith("created-") && !card && !activityBootstrapDone;

  if (waitingForCreatedCard) {
    return (
      <div className="min-h-screen bg-[#F1F1F1] pb-[50px]">
        <AppHeader type="title" title="みんなのコメント" />
        <main className="mx-auto max-w-lg px-[5.333vw] pt-12 text-center">
          <p className="text-base leading-relaxed text-[#191919]">
            準備中です。もう少し待ってね🙏
          </p>
        </main>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-[#F1F1F1]">
        <AppHeader type="title" title="みんなのコメント" />
        <main className="p-4">
          <p className="text-gray-600">カードが見つかりませんでした。</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 underline">
            ホームへ
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[120px] md:pb-24">
      <AppHeader type="title" title="みんなのコメント" />

      <main className="comments-page mx-auto max-w-lg px-[5.333vw] py-4 md:max-w-none md:px-6 md:py-6">
        {/* ページ上部：VOTE CARD mini（PCはタイル幅） */}
        <div className="comments-page__hero-wrap mb-4 md:mb-6">
          <div className="comments-page__hero-tile">
          <VoteCardMini
            backgroundImageUrl={backgroundUrl}
            patternType={card.patternType}
            question={card.question}
            optionA={card.optionA}
            optionB={card.optionB}
            countA={merged.countA}
            countB={merged.countB}
            commentCount={merged.commentCount}
            selectedSide={activity.userSelectedOption}
            userIconUrl={currentUser.type === "sns" && currentUser.iconUrl ? currentUser.iconUrl : "/default-avatar.png"}
            hasCommented={commentedCardIds.includes(id)}
            onVote={handleVote}
            cardId={id}
            bookmarked={headerBookmarked}
            onMoreClick={() =>
              moderation.openCardOptions(id, (card?.createdByUserId ?? "") === activityUserId)
            }
            onAddToCollectionClick={() => moderation.openAddToCommunity(id)}
            periodStart={card?.periodStart}
            periodEnd={card?.periodEnd}
            expandMiniForCommentsPage
            commentsDisabled={commentsDisabled}
            isRemote={isRemote}
            recordBookmarkEvent={recordBookmarkEvent}
          />
          </div>
        </div>

        {/* コメント：グレー帯の見出し + 白背景の一覧（PCは横いっぱい） */}
        <div className="comments-page__comments -mx-[5.333vw] overflow-hidden border-t border-[#DADADA]">
          <div className="flex items-center justify-between bg-[var(--color-bg)] px-[5.333vw] py-3 md:px-6">
            <h2 className="text-base font-bold text-[#191919]">コメント</h2>
            <CommentSortSegment value={commentSortOrder} onChange={setCommentSortOrder} />
          </div>
          <div className="bg-white">
          {activity.comments.length === 0 ? (
            <div className="px-[5.333vw] py-10 text-center md:px-6">
              <p className="text-sm text-[#787878]">
                {commentsDisabled ? "このVOTEはコメントを受け付けていません。" : "まだコメントはありません。"}
              </p>
            </div>
          ) : (
            (() => {
              const topLevel = activity.comments.filter((c) => !c.parentId);
              const sortedTop = sortTopLevelComments(topLevel, commentSortOrder);
              return sortedTop.map((c) => {
                const replies = activity.comments
                  .filter((r) => r.parentId === c.id)
                  .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
                const currentCard = {
                  countA: activity.countA ?? 0,
                  countB: activity.countB ?? 0,
                  comments: activity.comments ?? [],
                };
                return (
                  <CommentThreadGroup
                    key={c.id}
                    parent={c}
                    replies={replies}
                    likedCommentIds={likedCommentIds}
                    onParentLike={() => addCommentLike(stableId, c.id, currentCard)}
                    onParentReply={() => setReplyingToCommentId(c.id)}
                    onReplyLike={(r) => addCommentLike(stableId, r.id, currentCard)}
                    canReply={canUseReplyAction}
                    parentReplyThreadHref={`/comments/${id}/reply/${c.id}`}
                    maxRepliesVisible={1}
                    replyListMoreHref={replies.length > 1 ? `/comments/${id}/reply/${c.id}` : undefined}
                    replyToReplyHref={`/comments/${id}/reply/${c.id}`}
                    onCommentMore={(comment) => setCommentMenuTarget(comment)}
                  />
                );
              });
            })()
          )}
          </div>
        </div>

        {bottomVoteCards.length > 0 && (
          <section className="comments-page__vote-feed -mx-[5.333vw] mt-8 border-t border-gray-300 px-[5.333vw] pt-6 md:mx-0 md:px-0">
            <VoteCardList masonry>
              <VoteTimelineMasonry
                items={bottomTimelineItems}
                tagList={commentsPageTagList}
                createdVotesForTimeline={createdVotesForTimeline}
                activity={sharedActivity}
                commentedCardIdSet={commentedCardIdSet}
                bookmarkedIds={bookmarkedIds}
                currentUser={currentUser}
                isRemote={isRemote}
                recordBookmarkEvent={recordBookmarkEvent}
                onVote={(cid, option) => {
                  setRelatedKeepVotedVisibleIds((prev) => {
                    const next = new Set(prev);
                    next.add(cid);
                    return next;
                  });
                  void sharedAddVote(cid, option);
                }}
                onMoreClick={(cardId) => {
                  const related = bottomVoteCards.find(
                    (c) => (c.id ?? c.question) === cardId
                  );
                  moderation.openCardOptions(
                    cardId,
                    related?.createdByUserId === activityUserId
                  );
                }}
                onAddToCollectionClick={moderation.openAddToCommunity}
              />
            </VoteCardList>
          </section>
        )}
      </main>

      {/* 入力はモーダルで表示 */}
      <CommentInputModal
        open={isCommentModalOpen}
        onClose={() => {
          setIsCommentModalOpen(false);
          setReplyingToCommentId(null);
        }}
        cardId={stableId}
        onCommentSubmit={(cardId, payload) => handleCommentSubmit(cardId, payload, replyingToCommentId ?? undefined)}
        disabled={commentsDisabled || !isLoggedIn || effectiveSelectedOption == null}
        disabledPlaceholder={!isLoggedIn ? "ログインするとコメントできます" : undefined}
        currentUser={currentUser.type === "sns" ? { name: currentUser.name ?? "自分", iconUrl: currentUser.iconUrl } : undefined}
        showLoginButton={!isLoggedIn}
        loginReturnTo={`/comments/${id}`}
        replyToUserName={
          replyingToCommentId ? activity.comments.find((c) => c.id === replyingToCommentId)?.user.name : undefined
        }
        replyToUserIconUrl={
          replyingToCommentId ? activity.comments.find((c) => c.id === replyingToCommentId)?.user.iconUrl : undefined
        }
        onCancelReply={() => setReplyingToCommentId(null)}
      />

      {/* 画面下固定：入力を開くボタン（コメント受け付けないVOTEは非表示に近いグレー文言のみ） */}
      <div className="comments-page__post-bar fixed inset-x-0 bottom-14 z-30 bg-transparent px-4 pb-4">
        <div className="mx-auto max-w-lg md:mx-0 md:max-w-none">
          <Button
            type="button"
            variant="yellowPill"
            className={commentsDisabled ? "disabled:text-gray-600" : ""}
            onClick={() => {
              if (commentsDisabled) return;
              if (!isLoggedIn) {
                router.push(`/profile/login?returnTo=${encodeURIComponent(`/comments/${id}`)}`);
                return;
              }
              if (!canPostByVote) return;
              setIsCommentModalOpen(true);
            }}
            disabled={commentsDisabled || !canOpenPostModal}
          >
            {commentsDisabled
              ? "このVOTEはコメントを受け付けていません。"
              : !isLoggedIn
                ? "ログインするとコメントできるよ！"
                : canPostByVote
                  ? replyingToCommentId
                    ? "リプライする"
                    : "コメントする"
                  : "投票するとコメントできます"}
          </Button>
        </div>
      </div>

      <CardModerationModals
        cardOptionsCardId={moderation.cardOptionsCardId}
        cardOptionsIsOwnCard={moderation.cardOptionsIsOwnCard}
        reportCardId={moderation.reportCardId}
        addToCommunityCardId={moderation.addToCommunityCardId}
        isLoggedIn={isLoggedIn}
        onCloseOptions={moderation.closeCardOptions}
        onAddToCommunity={moderation.openAddToCommunity}
        onCloseAddToCommunity={moderation.closeAddToCommunity}
        onHideCard={(cid) => {
          const target = cid === id ? card : allCards.find((c) => (c.id ?? c.question) === cid);
          if (target?.createdByUserId) addHiddenUser(target.createdByUserId);
          addHiddenCard(cid);
          moderation.closeCardOptions();
        }}
        onReportCard={moderation.openReport}
        onCloseReport={moderation.closeReport}
      />

      {commentMenuTarget != null && (
        <CommentOptionsModal
          showDelete={isCommentAuthoredByCurrentUser(commentMenuTarget.user?.name, {
            isLoggedIn,
            displayName: auth.user?.name,
          })}
          onClose={() => setCommentMenuTarget(null)}
          onDelete={() => {
            const t = commentMenuTarget;
            if (!t) return;
            void sharedRemoveComment(stableId, t.id, {
              countA: activity.countA ?? 0,
              countB: activity.countB ?? 0,
              comments: activity.comments ?? [],
            });
          }}
          onReport={() => setCommentReportCardId(id)}
        />
      )}

      {commentReportCardId != null && (
        <ReportViolationModal
          cardId={commentReportCardId}
          onClose={() => setCommentReportCardId(null)}
        />
      )}

    </div>
  );
}
