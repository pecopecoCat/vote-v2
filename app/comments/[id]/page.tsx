"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import AppHeader from "../../components/AppHeader";
import VoteCardMini from "../../components/VoteCardMini";
import CardModerationModals from "../../components/CardModerationModals";
import ReportViolationModal from "../../components/ReportViolationModal";
import { CommentsVoteFeed } from "../../components/comments/CommentsVoteFeed";
import { CommentsVoteFeedRail } from "../../components/comments/CommentsVoteFeedRail";
import { getCollectionById } from "../../data/collections";
import CommentSortSegment from "../../components/CommentSortSegment";
import { groupRepliesByParentId, sortTopLevelComments, type CommentSortOrder } from "../../lib/commentSort";
import CommentThreadGroup from "../../components/CommentThreadGroup";
import Button from "../../components/Button";
import CommentInputModal from "../../components/CommentInputModal";
import CommentOptionsModal from "../../components/CommentOptionsModal";
import { CARD_BACKGROUND_IMAGES } from "../../data/voteCards";
import {
  getMergedCounts,
  addCommentLike,
  getCommentIdsLikedByCurrentUser,
  isCommentAuthoredByCurrentUser,
  COMMENT_LIKES_BY_ME_UPDATED_EVENT,
  type VoteComment,
} from "../../data/voteCardActivity";
import { useSharedData } from "../../context/SharedDataContext";
import { isCardBookmarked, getBookmarksUpdatedEventName } from "../../data/bookmarks";
import { getCurrentActivityUserId } from "../../data/auth";
import { normalizeCardIdKey } from "../../lib/normalize";
import { resolveActivityForCard } from "../../data/voteCardActivity";
import { resolveVoteCardByStableId } from "../../lib/resolveVoteCardByStableId";
import { resolveCardBackgroundUrl } from "../../lib/resolveCardBackgroundUrl";
import { useAuthState } from "../../hooks/useAuthState";
import { useCommentsVoteFeed } from "../../hooks/useCommentsVoteFeed";
import { useCommentedCardIdSet } from "../../hooks/useCommentedCardIdSet";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useCardModerationFlow } from "../../hooks/useCardModerationFlow";
import { resolveCommentUserDisplay } from "../../lib/resolveCommentUserDisplay";

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
  const commentedCardIdSet = useCommentedCardIdSet();
  const { hasVoteFeed, feedProps, onHideFeedCard } = useCommentsVoteFeed({
    card,
    cardId: id,
    moderation,
  });
  const [bookmarkRefreshKey, setBookmarkRefreshKey] = useState(0);
  const [commentReportCardId, setCommentReportCardId] = useState<string | null>(null);
  const [commentSortOrder, setCommentSortOrder] = useState<CommentSortOrder>("newest");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>(() => getCommentIdsLikedByCurrentUser(stableId));
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentMenuTarget, setCommentMenuTarget] = useState<VoteComment | null>(null);
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

  const repliesByParentId = useMemo(
    () => groupRepliesByParentId(activity.comments),
    [activity.comments]
  );

  const sortedTopLevelComments = useMemo(() => {
    const topLevel = activity.comments.filter((c) => !c.parentId);
    return sortTopLevelComments(topLevel, commentSortOrder);
  }, [activity.comments, commentSortOrder]);

  const backgroundUrl = card ? resolveCardBackgroundUrl(card, id) : CARD_BACKGROUND_IMAGES[0];
  const merged = card ? getMergedCounts(card.countA ?? 0, card.countB ?? 0, card.commentCount ?? 0, activity) : { countA: 0, countB: 0, commentCount: 0 };
  const activityUserId = typeof window !== "undefined" ? getCurrentActivityUserId() : "";
  const currentCardActivity = useMemo(
    () => ({
      countA: activity.countA ?? 0,
      countB: activity.countB ?? 0,
      comments: activity.comments ?? [],
    }),
    [activity.countA, activity.countB, activity.comments]
  );

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
    ).then(() => {
      setReplyingToCommentId(null);
      setIsCommentModalOpen(false);
    });
  };

  const openCommentModal = () => {
    setReplyingToCommentId(null);
    setIsCommentModalOpen(true);
  };

  const openReplyModal = (targetCommentId: string) => {
    setReplyingToCommentId(targetCommentId);
    setIsCommentModalOpen(true);
  };

  const replyTargetDisplay = useMemo(() => {
    if (!replyingToCommentId) return null;
    const target = activity.comments.find((c) => c.id === replyingToCommentId);
    return target ? resolveCommentUserDisplay(target) : null;
  }, [activity.comments, replyingToCommentId]);

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
    <div className="comments-page-shell min-h-screen bg-[#F1F1F1] pb-[120px] md:pb-24">
      <AppHeader type="title" title="みんなのコメント" />

      <main className="comments-page mx-auto max-w-lg px-[5.333vw] py-4 md:max-w-none md:px-6 md:py-6">
        <div className="comments-page__layout">
          <div className="comments-page__center min-w-0">
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
                  hasCommented={commentedCardIdSet.has(id)}
                  onVote={handleVote}
                  cardId={id}
                  bookmarked={headerBookmarked}
                  onMoreClick={() =>
                    moderation.openCardOptions(id, (card.createdByUserId ?? "") === activityUserId)
                  }
                  onAddToCollectionClick={() => moderation.openAddToCommunity(id)}
                  periodStart={card.periodStart}
                  periodEnd={card.periodEnd}
                  expandMiniForCommentsPage
                  commentsDisabled={commentsDisabled}
                  isRemote={isRemote}
                  recordBookmarkEvent={recordBookmarkEvent}
                />
              </div>
            </div>

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
                  sortedTopLevelComments.map((c) => {
                    const replies = repliesByParentId.get(c.id) ?? [];
                    return (
                      <CommentThreadGroup
                        key={c.id}
                        parent={c}
                        replies={replies}
                        likedCommentIds={likedCommentIds}
                        onParentLike={() => addCommentLike(stableId, c.id, currentCardActivity)}
                        onParentReply={() => openReplyModal(c.id)}
                        onReplyLike={(r) => addCommentLike(stableId, r.id, currentCardActivity)}
                        canReply={canUseReplyAction}
                        maxRepliesVisible={1}
                        replyListMoreHref={replies.length > 1 ? `/comments/${id}/reply/${c.id}` : undefined}
                        onCommentMore={(comment) => setCommentMenuTarget(comment)}
                      />
                    );
                  })
                )}
              </div>
            </div>

            <div className="comments-page__post-bar fixed inset-x-0 bottom-14 z-30 bg-transparent px-4 pb-4 md:static md:inset-auto md:bottom-auto md:z-auto md:mt-4 md:px-0 md:pb-0">
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
                    openCommentModal();
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
          </div>

          {hasVoteFeed && feedProps ? (
            <CommentsVoteFeedRail>
              <CommentsVoteFeed {...feedProps} />
            </CommentsVoteFeedRail>
          ) : null}
        </div>
      </main>

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
        replyToUserName={replyTargetDisplay?.name}
        replyToUserIconUrl={replyTargetDisplay?.iconUrl}
        onCancelReply={() => setReplyingToCommentId(null)}
      />

      <CardModerationModals
        cardOptionsCardId={moderation.cardOptionsCardId}
        cardOptionsIsOwnCard={moderation.cardOptionsIsOwnCard}
        reportCardId={moderation.reportCardId}
        addToCommunityCardId={moderation.addToCommunityCardId}
        isLoggedIn={isLoggedIn}
        onCloseOptions={moderation.closeCardOptions}
        onAddToCommunity={moderation.openAddToCommunity}
        onCloseAddToCommunity={moderation.closeAddToCommunity}
        onHideCard={onHideFeedCard}
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
            void sharedRemoveComment(stableId, t.id, currentCardActivity);
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
