"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "../../../../components/AppHeader";
import Button from "../../../../components/Button";
import CardModerationModals from "../../../../components/CardModerationModals";
import CommentInputModal from "../../../../components/CommentInputModal";
import CommentOptionsModal from "../../../../components/CommentOptionsModal";
import ReportViolationModal from "../../../../components/ReportViolationModal";
import { CommentsVoteFeed } from "../../../../components/comments/CommentsVoteFeed";
import { CommentsVoteFeedRail } from "../../../../components/comments/CommentsVoteFeedRail";
import { useAuthState } from "../../../../hooks/useAuthState";
import { useCardModerationFlow } from "../../../../hooks/useCardModerationFlow";
import { useCommentsVoteFeed } from "../../../../hooks/useCommentsVoteFeed";
import { useCurrentUser } from "../../../../hooks/useCurrentUser";
import { resolveVoteCardByStableId } from "../../../../lib/resolveVoteCardByStableId";
import { CommentAvatar, CommentBody } from "../../../../components/CommentThreadGroup";
import {
  addCommentLike,
  getCommentIdsLikedByCurrentUser,
  isCommentAuthoredByCurrentUser,
  resolveActivityForCard,
  COMMENT_LIKES_BY_ME_UPDATED_EVENT,
  type VoteComment,
} from "../../../../data/voteCardActivity";
import { useSharedData } from "../../../../context/SharedDataContext";
import { normalizeCardIdKey } from "../../../../lib/normalize";

export default function CommentReplyThreadPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "0";
  const stableId = normalizeCardIdKey(id);
  const commentId = typeof params.commentId === "string" ? params.commentId : "";
  const shared = useSharedData();
  const {
    createdVotesForTimeline,
    activity: sharedActivity,
    activityBootstrapDone,
    addComment: sharedAddComment,
    removeComment: sharedRemoveComment,
  } = shared;
  const activity = resolveActivityForCard(sharedActivity, stableId);

  const card = useMemo(
    () => resolveVoteCardByStableId(id, createdVotesForTimeline),
    [id, createdVotesForTimeline]
  );
  const moderation = useCardModerationFlow();
  const { hasVoteFeed, feedProps, onHideFeedCard } = useCommentsVoteFeed({
    card,
    cardId: id,
    moderation,
  });
  const auth = useAuthState();
  const currentUser = useCurrentUser(auth);
  const isLoggedIn = auth.isLoggedIn;
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>(() => getCommentIdsLikedByCurrentUser(stableId));
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [commentMenuTarget, setCommentMenuTarget] = useState<VoteComment | null>(null);
  const [reportCardId, setReportCardId] = useState<string | null>(null);
  const commentsDisabled = card?.commentsDisabled === true;
  const canPostByVote = activity.userSelectedOption != null;
  const canOpenPostModal = !commentsDisabled && (!isLoggedIn || canPostByVote);

  useEffect(() => {
    const handler = () => setLikedCommentIds(getCommentIdsLikedByCurrentUser(stableId));
    window.addEventListener(COMMENT_LIKES_BY_ME_UPDATED_EVENT, handler);
    return () => window.removeEventListener(COMMENT_LIKES_BY_ME_UPDATED_EVENT, handler);
  }, [stableId]);

  const parent = useMemo(
    () => activity.comments.find((c) => c.id === commentId) ?? null,
    [activity.comments, commentId]
  );

  const replies = useMemo(() => {
    if (!parent) return [];
    return activity.comments
      .filter((r) => r.parentId === parent.id)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [activity.comments, parent]);

  const currentCard = useMemo(
    () => ({
      countA: activity.countA ?? 0,
      countB: activity.countB ?? 0,
      comments: activity.comments ?? [],
    }),
    [activity.countA, activity.countB, activity.comments]
  );

  const handleCommentSubmit = (
    cardId: string,
    payload: { user: { name: string; iconUrl?: string }; text: string },
    parentCommentId?: string
  ) => {
    const commenterVote = activity.userSelectedOption;
    void sharedAddComment(cardId, payload, parentCommentId, commenterVote).then(() => setReplyingToCommentId(null));
  };

  const waitingForCreatedCard =
    id.startsWith("created-") && !card && !activityBootstrapDone;

  if (waitingForCreatedCard) {
    return (
      <div className="min-h-screen bg-[#F1F1F1] pb-[120px]">
        <AppHeader type="title" title="リプライ" backHref={`/comments/${id}`} />
        <main className="mx-auto max-w-lg px-[5.333vw] pt-12 text-center">
          <p className="text-base leading-relaxed text-[#191919]">
            準備中です。もう少し待ってね🙏
          </p>
        </main>
      </div>
    );
  }

  if (!card || !parent) {
    return (
      <div className="min-h-screen bg-[#F1F1F1]">
        <AppHeader type="title" title="リプライ" backHref={`/comments/${id}`} />
        <main className="p-4 px-[5.333vw]">
          <p className="text-sm text-[#787878]">コメントが見つかりませんでした。</p>
          <Link href={`/comments/${id}`} className="mt-4 inline-block text-sm font-medium text-[#191919] underline">
            みんなのコメントへ戻る
          </Link>
        </main>
      </div>
    );
  }

  const headerTitle = `${parent.user.name}へのリプライ`;
  const replyTargetName = replyingToCommentId
    ? activity.comments.find((c) => c.id === replyingToCommentId)?.user.name
    : parent.user.name;
  const replyTargetIconUrl = replyingToCommentId
    ? activity.comments.find((c) => c.id === replyingToCommentId)?.user.iconUrl
    : parent.user.iconUrl;

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[120px] md:pb-24">
      <AppHeader type="title" title={headerTitle} backHref={`/comments/${id}`} />

      <main className="comments-page mx-auto max-w-lg px-[5.333vw] py-4 md:max-w-none md:px-6 md:py-6">
        <div className="comments-page__layout">
          <div className="comments-page__center min-w-0">
            <div className="comments-page__comments -mx-[5.333vw] overflow-hidden border-t border-[#DADADA]">
              <section className="bg-white px-[5.333vw] pb-4 pt-4 md:px-6">
                <div className="flex items-end gap-3">
                  <div className="flex min-h-[72px] w-10 shrink-0 flex-col items-center self-stretch">
                    <div className="min-h-[20px] w-px flex-1 bg-[#DADADA]" aria-hidden />
                    <CommentAvatar comment={parent} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CommentBody
                      comment={parent}
                      onLike={() => addCommentLike(stableId, parent.id, currentCard)}
                      isLikedByMe={likedCommentIds.includes(parent.id)}
                      replyCountOverride={0}
                      onCommentMore={() => setCommentMenuTarget(parent)}
                    />
                  </div>
                </div>
              </section>

              <div className="flex items-center border-b border-[#DADADA] bg-[var(--color-bg)] px-[5.333vw] py-3 md:px-6">
                <h2 className="text-base font-bold text-[#191919]">リプライ</h2>
              </div>

              <div className="bg-white">
                {replies.length === 0 ? (
                  <div className="px-[5.333vw] py-10 text-center md:px-6">
                    <p className="text-sm text-[#787878]">まだリプライはありません。</p>
                  </div>
                ) : (
                  replies.map((r) => (
                    <div key={r.id} className="flex gap-3 border-b border-[#DADADA] px-[5.333vw] py-4 md:px-6">
                      <CommentAvatar comment={r} />
                      <CommentBody
                        comment={r}
                        onLike={() => addCommentLike(stableId, r.id, currentCard)}
                        isLikedByMe={likedCommentIds.includes(r.id)}
                        replyCountOverride={0}
                        onCommentMore={() => setCommentMenuTarget(r)}
                      />
                    </div>
                  ))
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
                      router.push(
                        `/profile/login?returnTo=${encodeURIComponent(`/comments/${id}/reply/${commentId}`)}`
                      );
                      return;
                    }
                    if (!canPostByVote) return;
                    setReplyingToCommentId(null);
                    setIsReplyModalOpen(true);
                  }}
                  disabled={commentsDisabled || !canOpenPostModal}
                >
                  {commentsDisabled
                    ? "このVOTEはコメントを受け付けていません。"
                    : !isLoggedIn
                      ? "ログインするとリプライできるよ！"
                      : canPostByVote
                        ? "リプライする"
                        : "投票するとリプライできます"}
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
        open={isReplyModalOpen}
        onClose={() => {
          setIsReplyModalOpen(false);
          setReplyingToCommentId(null);
        }}
        cardId={stableId}
        onCommentSubmit={(cardId, payload) => handleCommentSubmit(cardId, payload, replyingToCommentId ?? parent.id)}
        disabled={commentsDisabled || !isLoggedIn || activity.userSelectedOption == null}
        disabledPlaceholder={!isLoggedIn ? "ログインするとコメントできます" : undefined}
        currentUser={currentUser.type === "sns" ? { name: currentUser.name ?? "自分", iconUrl: currentUser.iconUrl } : undefined}
        showLoginButton={!isLoggedIn}
        loginReturnTo={`/comments/${id}/reply/${commentId}`}
        replyToUserName={replyTargetName}
        replyToUserIconUrl={replyTargetIconUrl}
        onCancelReply={replyingToCommentId ? () => setReplyingToCommentId(null) : undefined}
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
            void sharedRemoveComment(id, t.id, currentCard);
          }}
          onReport={() => setReportCardId(id)}
        />
      )}

      {reportCardId != null && (
        <ReportViolationModal cardId={reportCardId} onClose={() => setReportCardId(null)} />
      )}

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
    </div>
  );
}
