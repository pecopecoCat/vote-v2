"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "../../../../components/AppHeader";
import CommentInputModal from "../../../../components/CommentInputModal";
import { CommentAvatar, CommentBody } from "../../../../components/CommentThreadGroup";
import { getVoteCardById, voteCardsData } from "../../../../data/voteCards";
import {
  addCommentLike,
  getCommentIdsLikedByCurrentUser,
  COMMENT_LIKES_BY_ME_UPDATED_EVENT,
  type VoteComment,
} from "../../../../data/voteCardActivity";
import { useSharedData } from "../../../../context/SharedDataContext";
import { getAuth, getAuthUpdatedEventName } from "../../../../data/auth";
import type { VoteCardData } from "../../../../data/voteCards";

function getCardByStableId(id: string, createdVotesForTimeline: VoteCardData[]): VoteCardData | null {
  if (id.startsWith("seed-")) {
    const index = parseInt(id.slice(5), 10);
    if (Number.isNaN(index) || index < 0 || index >= voteCardsData.length) return null;
    return { ...voteCardsData[index], id: `seed-${index}` };
  }
  if (id.startsWith("created-")) {
    return createdVotesForTimeline.find((c) => c.id === id) ?? null;
  }
  const card = getVoteCardById(id);
  if (card) return { ...card, id: `seed-${id}` };
  return null;
}

const emptyActivity = { countA: 0, countB: 0, comments: [] as VoteComment[], userSelectedOption: undefined as "A" | "B" | undefined };

export default function CommentReplyThreadPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "0";
  const commentId = typeof params.commentId === "string" ? params.commentId : "";
  const shared = useSharedData();
  const { createdVotesForTimeline, activity: sharedActivity, addComment: sharedAddComment } = shared;
  const activity = sharedActivity[id] ?? emptyActivity;

  const [card, setCard] = useState<VoteCardData | null>(() => {
    if (id.startsWith("created-")) return null;
    return getCardByStableId(id, createdVotesForTimeline);
  });
  const [resolved, setResolved] = useState(!id.startsWith("created-"));
  const [auth, setAuth] = useState(() => getAuth());
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>(() => getCommentIdsLikedByCurrentUser(id));
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const isLoggedIn = auth.isLoggedIn;
  const canPostByVote = activity.userSelectedOption != null;
  const canOpenPostModal = !isLoggedIn || canPostByVote;

  useEffect(() => {
    const handler = () => setLikedCommentIds(getCommentIdsLikedByCurrentUser(id));
    window.addEventListener(COMMENT_LIKES_BY_ME_UPDATED_EVENT, handler);
    return () => window.removeEventListener(COMMENT_LIKES_BY_ME_UPDATED_EVENT, handler);
  }, [id]);

  useEffect(() => {
    const handler = () => setAuth(getAuth());
    window.addEventListener(getAuthUpdatedEventName(), handler);
    return () => window.removeEventListener(getAuthUpdatedEventName(), handler);
  }, []);

  useEffect(() => {
    if (!id.startsWith("created-")) return;
    const c = getCardByStableId(id, createdVotesForTimeline);
    setCard(c);
    setResolved(true);
  }, [id, createdVotesForTimeline]);

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

  const currentCard = {
    countA: activity.countA ?? 0,
    countB: activity.countB ?? 0,
    comments: activity.comments ?? [],
  };

  const currentUser = isLoggedIn && auth.user
    ? { type: "sns" as const, name: auth.user.name, iconUrl: auth.user.iconUrl }
    : { type: "guest" as const };

  const handleCommentSubmit = (
    cardId: string,
    payload: { user: { name: string; iconUrl?: string }; text: string },
    parentCommentId?: string
  ) => {
    const commenterVote = activity.userSelectedOption;
    void sharedAddComment(cardId, payload, parentCommentId, commenterVote).then(() => setReplyingToCommentId(null));
  };

  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F1F1]">
        <p className="text-gray-500">読み込み中...</p>
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
    <div className="min-h-screen bg-[#F1F1F1] pb-[120px]">
      <AppHeader type="title" title={headerTitle} backHref={`/comments/${id}`} />

      <main>
        <section className="border-b border-[#DADADA] bg-white px-[5.333vw] pb-4 pt-4">
          <div className="flex items-end gap-3">
            <div className="flex min-h-[72px] w-10 shrink-0 flex-col items-center self-stretch">
              <div className="min-h-[20px] w-px flex-1 bg-[#DADADA]" aria-hidden />
              <CommentAvatar comment={parent} />
            </div>
            <div className="min-w-0 flex-1">
              <CommentBody
                comment={parent}
                onLike={() => addCommentLike(id, parent.id, currentCard)}
                isLikedByMe={likedCommentIds.includes(parent.id)}
                replyCountOverride={0}
              />
            </div>
          </div>
        </section>

        <div className="flex items-center border-b border-[#DADADA] bg-[var(--color-bg)] px-[5.333vw] py-3">
          <h2 className="text-base font-bold text-[#191919]">リプライ</h2>
        </div>

        <div className="bg-white">
          {replies.length === 0 ? (
            <div className="px-[5.333vw] py-10 text-center">
              <p className="text-sm text-[#787878]">まだリプライはありません。</p>
            </div>
          ) : (
            replies.map((r) => (
              <div key={r.id} className="flex gap-3 border-b border-[#DADADA] px-[5.333vw] py-4">
                <CommentAvatar comment={r} />
                <CommentBody
                  comment={r}
                  onLike={() => addCommentLike(id, r.id, currentCard)}
                  isLikedByMe={likedCommentIds.includes(r.id)}
                  replyCountOverride={0}
                />
              </div>
            ))
          )}
        </div>
      </main>

      <CommentInputModal
        open={isReplyModalOpen}
        onClose={() => {
          setIsReplyModalOpen(false);
          setReplyingToCommentId(null);
        }}
        cardId={id}
        onCommentSubmit={(cardId, payload) => handleCommentSubmit(cardId, payload, replyingToCommentId ?? parent.id)}
        disabled={!isLoggedIn || activity.userSelectedOption == null}
        disabledPlaceholder={!isLoggedIn ? "ログインするとコメントできます" : undefined}
        currentUser={currentUser.type === "sns" ? { name: currentUser.name ?? "自分", iconUrl: currentUser.iconUrl } : undefined}
        showLoginButton={!isLoggedIn}
        loginReturnTo={`/comments/${id}/reply/${commentId}`}
        replyToUserName={replyTargetName}
        replyToUserIconUrl={replyTargetIconUrl}
        onCancelReply={replyingToCommentId ? () => setReplyingToCommentId(null) : undefined}
      />

      <div className="fixed inset-x-0 bottom-0 z-30 bg-transparent px-4 pb-4">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            className={`w-full rounded-[9999px] py-3.5 text-center text-sm font-bold shadow-lg ${
              canOpenPostModal
                ? "bg-[#FFE100] text-gray-900 hover:opacity-95 active:opacity-90"
                : "cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF]"
            }`}
            onClick={() => {
              if (!isLoggedIn) {
                router.push(
                  `/profile/login?returnTo=${encodeURIComponent(`/comments/${id}/reply/${commentId}`)}`
                );
                return;
              }
              if (!canPostByVote) return;
              setIsReplyModalOpen(true);
            }}
            disabled={!canOpenPostModal}
          >
            {!isLoggedIn
              ? "ログインするとリプライできるよ！"
              : canPostByVote
                ? "リプライする"
                : "投票するとリプライできます"}
          </button>
        </div>
      </div>
    </div>
  );
}
