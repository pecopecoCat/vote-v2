"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import AppHeader from "../../components/AppHeader";
import VoteCard from "../../components/VoteCard";
import VoteCardMini from "../../components/VoteCardMini";
import CollectionCard from "../../components/CollectionCard";
import BottomNav from "../../components/BottomNav";
import CardOptionsModal from "../../components/CardOptionsModal";
import ReportViolationModal from "../../components/ReportViolationModal";
import BookmarkCollectionModal from "../../components/BookmarkCollectionModal";
import RecommendedTags from "../../components/RecommendedTags";
import NewestOldestSortDropdown from "../../components/NewestOldestSortDropdown";
import CommentThreadGroup from "../../components/CommentThreadGroup";
import CommentInputModal from "../../components/CommentInputModal";
import CommentOptionsModal from "../../components/CommentOptionsModal";
import {
  getVoteCardById,
  voteCardsData,
  CARD_BACKGROUND_IMAGES,
  getRelatedVoteCardsByTagPriority,
  getNewestVoteCards,
} from "../../data/voteCards";
import { getTagsSimilarTo, popularCollections, trendingTags, type CollectionGradient } from "../../data/search";
import { getCollections, getOtherUsersCollections } from "../../data/collections";
import {
  getMergedCounts,
  addCommentLike,
  getCommentIdsLikedByCurrentUser,
  isCommentAuthoredByCurrentUser,
  COMMENT_LIKES_BY_ME_UPDATED_EVENT,
  type VoteComment,
} from "../../data/voteCardActivity";
import { useSharedData } from "../../context/SharedDataContext";
import { isCardBookmarked } from "../../data/bookmarks";
import { getAuth, getAuthUpdatedEventName, getCurrentActivityUserId } from "../../data/auth";
import { addHiddenUser } from "../../data/hiddenUsers";
import { addHiddenCard } from "../../data/hiddenCards";
import type { VoteCardData } from "../../data/voteCards";

/** stableId (seed-N / created-xxx / 0,1,...) からカードを取得 */
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

function backgroundForCard(card: VoteCardData, cardId: string): string {
  if (card.backgroundImageUrl) return card.backgroundImageUrl;
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = ((h << 5) - h + cardId.charCodeAt(i)) | 0;
  return CARD_BACKGROUND_IMAGES[Math.abs(h) % CARD_BACKGROUND_IMAGES.length];
}

const emptyActivity = { countA: 0, countB: 0, comments: [] as VoteComment[], userSelectedOption: undefined as "A" | "B" | undefined };

export default function CommentsPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "0";
  const shared = useSharedData();
  const {
    createdVotesForTimeline,
    activity: sharedActivity,
    addVote: sharedAddVote,
    addComment: sharedAddComment,
    removeComment: sharedRemoveComment,
  } = shared;
  const activity = sharedActivity[id] ?? emptyActivity;

  const [card, setCard] = useState<VoteCardData | null>(() => {
    if (id.startsWith("created-")) return null;
    return getCardByStableId(id, createdVotesForTimeline);
  });
  const [resolved, setResolved] = useState(!id.startsWith("created-"));
  const [cardOptionsCardId, setCardOptionsCardId] = useState<string | null>(null);
  const [cardOptionsIsOwnCard, setCardOptionsIsOwnCard] = useState(false);
  const [reportCardId, setReportCardId] = useState<string | null>(null);
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [auth, setAuth] = useState(() => getAuth());
  const [commentSortOrder, setCommentSortOrder] = useState<"newest" | "oldest">("newest");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>(() => getCommentIdsLikedByCurrentUser(id));
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentMenuTarget, setCommentMenuTarget] = useState<VoteComment | null>(null);
  /**
   * 下部「関連VOTE／新着VOTE」：投票直後は一覧に残し、別ページ遷移やタブ復帰後に activity に合わせて非表示にする（HOME と同様）。
   */
  const [relatedKeepVotedVisibleIds, setRelatedKeepVotedVisibleIds] = useState<Set<string>>(() => new Set());
  /** 遷移直後はコメント帯が画面上部に来るようスクロール（固定ヘッダ分は scroll-mt で確保） */
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = auth.isLoggedIn;
  const commentsDisabled = card?.commentsDisabled === true;
  const canPostByVote = activity.userSelectedOption != null;
  const canOpenPostModal = !commentsDisabled && (!isLoggedIn || canPostByVote);
  const canUseReplyAction = !commentsDisabled && isLoggedIn && canPostByVote;

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

  useEffect(() => {
    if (!id.startsWith("created-")) return;
    const c = getCardByStableId(id, createdVotesForTimeline);
    setCard(c);
    setResolved(true);
  }, [id, createdVotesForTimeline]);

  useLayoutEffect(() => {
    if (!resolved || !card) return;
    const el = commentsSectionRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "auto", block: "start" });
      });
    });
  }, [id, resolved, card?.id]);

  const allCards = useMemo(() => {
    const seedWithId = voteCardsData.map((c, i) => ({ ...c, id: `seed-${i}` }));
    return [...createdVotesForTimeline, ...seedWithId];
  }, [createdVotesForTimeline]);

  /**
   * 下部一覧: 関連を最大10件。関連が1〜9件のときはその下に新着を別見出しで10件（重複除外）。
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

  /** みんなのコメントページ：カードにタグあり→1個目に似たタグ10件、なし→注目のタグ10件 */
  const commentsPageTagList = useMemo(() => {
    if (!card?.tags?.length) return trendingTags.map((t) => t.tag).slice(0, 10);
    return getTagsSimilarTo(card.tags[0], allCards, 10);
  }, [card?.tags, allCards]);

  /** みんなのコメントページ：実際にあるコレクションから1件表示（カードIDで安定選択） */
  const randomCollectionForComments = useMemo(() => {
    const other = getOtherUsersCollections().map((c) => ({
      id: c.id,
      title: c.name,
      gradient: (c.gradient ?? "orange-yellow") as CollectionGradient,
    }));
    const mine = getCollections()
      .filter((c) => c.visibility !== "member")
      .map((c) => ({
        id: c.id,
        title: c.name,
        gradient: (c.gradient ?? "orange-yellow") as CollectionGradient,
      }));
    const pool = [...popularCollections, ...other, ...mine];
    if (pool.length === 0) return null;
    let h = 0;
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
    return pool[Math.abs(h) % pool.length];
  }, [id]);

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

  const backgroundUrl = card ? backgroundForCard(card, id) : CARD_BACKGROUND_IMAGES[0];
  const merged = card ? getMergedCounts(card.countA ?? 0, card.countB ?? 0, card.commentCount ?? 0, activity) : { countA: 0, countB: 0, commentCount: 0 };
  const currentUser = isLoggedIn && auth.user
    ? { type: "sns" as const, name: auth.user.name, iconUrl: auth.user.iconUrl }
    : { type: "guest" as const };

  const handleVote = (side: "A" | "B") => {
    void sharedAddVote(id, side);
  };

  const handleCommentSubmit = (
    cardId: string,
    payload: { user: { name: string; iconUrl?: string }; text: string },
    parentCommentId?: string
  ) => {
    const commenterVote = activity.userSelectedOption;
    void sharedAddComment(cardId, payload, parentCommentId, commenterVote).then(() =>
      setReplyingToCommentId(null)
    );
  };

  const mapBottomVoteList = (cards: VoteCardData[]) =>
    cards.map((related) => {
      const relatedId = related.id ?? related.question;
      const relActivity = sharedActivity[relatedId] ?? emptyActivity;
      const relMerged = getMergedCounts(
        related.countA ?? 0,
        related.countB ?? 0,
        related.commentCount ?? 0,
        relActivity
      );
      return (
        <VoteCard
          key={relatedId}
          backgroundImageUrl={backgroundForCard(related, relatedId)}
          patternType={related.patternType}
          question={related.question}
          optionA={related.optionA}
          optionB={related.optionB}
          countA={relMerged.countA}
          countB={relMerged.countB}
          commentCount={relMerged.commentCount}
          tags={related.tags}
          readMoreText={related.readMoreText}
          creator={related.creator}
          currentUser={currentUser}
          cardId={relatedId}
          bookmarked={isCardBookmarked(relatedId)}
          hasCommented={commentedCardIds.includes(relatedId)}
          initialSelectedOption={relActivity.userSelectedOption ?? null}
          onVote={(cid, option) => {
            setRelatedKeepVotedVisibleIds((prev) => {
              const next = new Set(prev);
              next.add(cid);
              return next;
            });
            void sharedAddVote(cid, option);
          }}
          onBookmarkClick={setModalCardId}
          onMoreClick={() => {
            setCardOptionsCardId(relatedId);
            setCardOptionsIsOwnCard(related.createdByUserId === getCurrentActivityUserId());
          }}
          visibility={related.visibility}
          optionAImageUrl={related.optionAImageUrl}
          optionBImageUrl={related.optionBImageUrl}
          periodStart={related.periodStart}
          periodEnd={related.periodEnd}
          commentsDisabled={related.commentsDisabled === true}
        />
      );
    });

  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F1F1]">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-[#F1F1F1]">
        <AppHeader type="title" title="みんなのコメント" backHref="/" />
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
    <div className="min-h-screen bg-[#F1F1F1] pb-[120px]">
      <AppHeader type="title" title="みんなのコメント" backHref="/" />

      <main className="mx-auto max-w-lg px-[5.333vw] py-4">
        {/* ページ上部：VOTE CARD mini（登録された投票数・コメント数を反映） */}
        <div className="mb-4">
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
            bookmarked={isCardBookmarked(id)}
            onBookmarkClick={setModalCardId}
            onMoreClick={() => {
              setCardOptionsCardId(id);
              setCardOptionsIsOwnCard((card?.createdByUserId ?? "") === getCurrentActivityUserId());
            }}
            periodStart={card?.periodStart}
            periodEnd={card?.periodEnd}
            expandMiniForCommentsPage
            commentsDisabled={commentsDisabled}
          />
        </div>

        {/* コメント：グレー帯の見出し + 白背景の一覧（デザイン参照） */}
        <div
          ref={commentsSectionRef}
          className="-mx-[5.333vw] scroll-mt-16 overflow-hidden border-t border-[#DADADA]"
        >
          <div className="flex items-center justify-between bg-[var(--color-bg)] px-[5.333vw] py-3">
            <h2 className="text-base font-bold text-[#191919]">コメント</h2>
            <NewestOldestSortDropdown
              value={commentSortOrder}
              onChange={setCommentSortOrder}
              menuAlign="right"
              arrowStroke="#787878"
            />
          </div>
          <div className="bg-white">
          {activity.comments.length === 0 ? (
            <div className="px-[5.333vw] py-10 text-center">
              <p className="text-sm text-[#787878]">
                {commentsDisabled ? "このVOTEはコメントを受け付けていません。" : "まだコメントはありません。"}
              </p>
            </div>
          ) : (
            (() => {
              const topLevel = activity.comments.filter((c) => !c.parentId);
              const sortedTop = [...topLevel].sort((a, b) =>
                commentSortOrder === "newest"
                  ? (b.date ?? "").localeCompare(a.date ?? "")
                  : (a.date ?? "").localeCompare(b.date ?? "")
              );
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
                    onParentLike={() => addCommentLike(id, c.id, currentCard)}
                    onParentReply={() => setReplyingToCommentId(c.id)}
                    onReplyLike={(r) => addCommentLike(id, r.id, currentCard)}
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

        <RecommendedTags className="mt-6" tags={commentsPageTagList} />

        {randomCollectionForComments && (
          <div className="mt-6">
            <CollectionCard
              key={randomCollectionForComments.id}
              id={randomCollectionForComments.id}
              title={randomCollectionForComments.title}
              gradient={randomCollectionForComments.gradient}
              titleVariant="blackBlock"
              href={`/collection/${randomCollectionForComments.id}`}
              timelineBanner
            />
          </div>
        )}

        {/* 一番下：関連VOTE（最大10件）。1〜9件のときは下に新着VOTE 10件。関連0件のときは新着のみ — HOMEと同じNORMALサイズ */}
        {relatedBottomCards.length > 0 && (
          <section className="-mx-[5.333vw] mt-8 border-t border-gray-300 px-[5.333vw] pt-6">
            <h2 className="mb-3 text-base font-bold text-gray-900">関連VOTE</h2>
            <div className="flex flex-col gap-[5.333vw]">{mapBottomVoteList(relatedBottomCards)}</div>
          </section>
        )}
        {newestBottomCards.length > 0 && (
          <section className="-mx-[5.333vw] mt-8 border-t border-gray-300 px-[5.333vw] pt-6">
            <h2 className="mb-3 text-base font-bold text-gray-900">新着VOTE</h2>
            <div className="flex flex-col gap-[5.333vw]">{mapBottomVoteList(newestBottomCards)}</div>
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
        cardId={id}
        onCommentSubmit={(cardId, payload) => handleCommentSubmit(cardId, payload, replyingToCommentId ?? undefined)}
        disabled={commentsDisabled || !isLoggedIn || activity.userSelectedOption == null}
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
      <div className="fixed inset-x-0 bottom-14 z-30 bg-transparent px-4 pb-4">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            className={`w-full rounded-[9999px] py-3.5 text-center text-sm font-bold shadow-lg ${
              commentsDisabled
                ? "cursor-default bg-[#E5E7EB] text-gray-600"
                : canOpenPostModal
                  ? "bg-[#FFE100] text-gray-900 hover:opacity-95 active:opacity-90"
                  : "cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF]"
            }`}
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
          </button>
        </div>
      </div>

      <BottomNav activeId="home" />

      {cardOptionsCardId != null && (
        <CardOptionsModal
          cardId={cardOptionsCardId}
          isOwnCard={cardOptionsIsOwnCard}
          onClose={() => setCardOptionsCardId(null)}
          onHide={(cid) => {
            const target = cid === id ? card : allCards.find((c) => (c.id ?? c.question) === cid);
            if (target?.createdByUserId) addHiddenUser(target.createdByUserId);
            addHiddenCard(cid);
            setCardOptionsCardId(null);
          }}
          onReport={(cid) => {
            setReportCardId(cid);
            setCardOptionsCardId(null);
          }}
        />
      )}

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
            void sharedRemoveComment(id, t.id, {
              countA: activity.countA ?? 0,
              countB: activity.countB ?? 0,
              comments: activity.comments ?? [],
            });
          }}
          onReport={() => setReportCardId(id)}
        />
      )}

      {reportCardId != null && (
        <ReportViolationModal
          cardId={reportCardId}
          onClose={() => setReportCardId(null)}
        />
      )}

      {modalCardId != null && (
        <BookmarkCollectionModal
          cardId={modalCardId}
          onClose={() => setModalCardId(null)}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
}
