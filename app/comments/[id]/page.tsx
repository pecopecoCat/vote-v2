"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import AppHeader from "../../components/AppHeader";
import VoteCard from "../../components/VoteCard";
import VoteCardCompact from "../../components/VoteCardCompact";
import VoteCardMini from "../../components/VoteCardMini";
import CardOptionsModal from "../../components/CardOptionsModal";
import RecommendedTags from "../../components/RecommendedTags";
import CommentInput from "../../components/CommentInput";
import {
  getVoteCardById,
  voteCardsData,
  CARD_BACKGROUND_IMAGES,
  getRelatedVoteCards,
  getNewestVoteCards,
  recommendedTagList,
} from "../../data/voteCards";
import { getCreatedVotes } from "../../data/createdVotes";
import {
  getActivity,
  addVote as persistVote,
  addComment as persistComment,
  getMergedCounts,
  getCardIdsUserCommentedOn,
  type VoteComment,
} from "../../data/voteCardActivity";
import type { VoteCardData } from "../../data/voteCards";

/** stableId (seed-N / created-xxx / 0,1,...) からカードを取得 */
function getCardByStableId(id: string): VoteCardData | null {
  if (id.startsWith("seed-")) {
    const index = parseInt(id.slice(5), 10);
    if (Number.isNaN(index) || index < 0 || index >= voteCardsData.length) return null;
    return { ...voteCardsData[index], id: `seed-${index}` };
  }
  if (id.startsWith("created-")) {
    if (typeof window === "undefined") return null;
    const created = getCreatedVotes();
    return created.find((c) => c.id === id) ?? null;
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

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

/** コメント日付を表示用にフォーマット */
function formatCommentDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function CommentsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "0";
  const [card, setCard] = useState<VoteCardData | null>(() => {
    if (id.startsWith("created-")) return null;
    return getCardByStableId(id);
  });
  const [activity, setActivity] = useState<ReturnType<typeof getActivity>>(() => getActivity(id));
  const [resolved, setResolved] = useState(!id.startsWith("created-"));
  const [cardOptionsCardId, setCardOptionsCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!id.startsWith("created-")) return;
    const c = getCardByStableId(id);
    setCard(c);
    setResolved(true);
  }, [id]);

  useEffect(() => {
    setActivity(getActivity(id));
  }, [id]);

  const allCards = useMemo(() => {
    const created = getCreatedVotes();
    const seedWithId = voteCardsData.map((c, i) => ({ ...c, id: `seed-${i}` }));
    return [...created, ...seedWithId];
  }, []);

  const relatedCards = useMemo(() => {
    if (!card) return [];
    return getRelatedVoteCards(card, allCards, id, 5);
  }, [card, allCards, id]);

  const fallbackCards = useMemo(() => {
    return getNewestVoteCards(allCards, id, 5);
  }, [allCards, id]);

  const bottomCards = relatedCards.length > 0 ? relatedCards : fallbackCards;
  const bottomSectionTitle = relatedCards.length > 0 ? "関連VOTE" : "新着";
  const commentedCardIds = useMemo(() => getCardIdsUserCommentedOn(), [activity]);

  const backgroundUrl = card ? backgroundForCard(card, id) : CARD_BACKGROUND_IMAGES[0];
  const merged = card ? getMergedCounts(card.countA ?? 0, card.countB ?? 0, card.commentCount ?? 0, activity) : { countA: 0, countB: 0, commentCount: 0 };

  const handleVote = (side: "A" | "B") => {
    persistVote(id, side);
    setActivity(getActivity(id));
  };

  const handleCommentSubmit = (cardId: string, payload: { user: { name: string; iconUrl?: string }; text: string }) => {
    persistComment(cardId, payload);
    setActivity(getActivity(id));
  };

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
    <div className="min-h-screen bg-[#F1F1F1] pb-24">
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
            userIconUrl="/default-avatar.png"
            hasCommented={commentedCardIds.includes(id)}
            onVote={handleVote}
          />
        </div>

        {/* コメント見出し + 新着順 */}
        <div className="mb-3 flex items-center justify-between border-t border-gray-200 pt-4">
          <h2 className="text-base font-bold text-gray-900">コメント</h2>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700"
          >
            新着順
            <span className="text-[#FFE100]">▼</span>
          </button>
        </div>

        {/* コメント一覧：登録されているコメント情報（ユーザー・日付・テキスト）を表示 */}
        <div className="border-t border-gray-200 space-y-0">
          {activity.comments.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">まだコメントはありません。</p>
          ) : (
            activity.comments.map((c) => (
              <CommentRow key={c.id} comment={c} />
            ))
          )}

          <RecommendedTags tags={recommendedTagList} />
        </div>

        {/* 一番下：関連VOTE（同じタグ+アクションあり）、なければ新着 — HOMEと同じNORMALサイズ */}
        {bottomCards.length > 0 && (
          <section className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="mb-3 text-base font-bold text-gray-900">{bottomSectionTitle}</h2>
            <div className="flex flex-col gap-6">
              {bottomCards.map((related) => {
                const relatedId = related.id ?? related.question;
                const relActivity = getActivity(relatedId);
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
                    cardId={relatedId}
                    bookmarked={related.bookmarked ?? false}
                    hasCommented={commentedCardIds.includes(relatedId)}
                    initialSelectedOption={relActivity.userSelectedOption ?? null}
                    onVote={(cid, option) => {
                      persistVote(cid, option);
                      setActivity(getActivity(id));
                    }}
                    onMoreClick={setCardOptionsCardId}
                    visibility={related.visibility}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* ページ下：コメント入力（送信で登録され、コメント数・一覧に反映） */}
      <CommentInput cardId={id} onCommentSubmit={handleCommentSubmit} />

      {cardOptionsCardId != null && (
        <CardOptionsModal
          cardId={cardOptionsCardId}
          onClose={() => setCardOptionsCardId(null)}
        />
      )}
    </div>
  );
}

function CommentRow({ comment }: { comment: VoteComment }) {
  return (
    <div className="flex gap-3 border-b border-gray-200 py-3 last:border-b-0">
      <div className="shrink-0">
        <span className="flex h-10 w-10 overflow-hidden rounded-full bg-gray-200">
          <img src={comment.user.iconUrl ?? "/default-avatar.png"} alt="" className="h-full w-full object-cover" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800">{comment.user.name}</p>
        <p className="mt-0.5 text-sm text-[#191919]">{comment.text}</p>
        <p className="mt-1 text-xs text-gray-500">{formatCommentDate(comment.date)}</p>
      </div>
      <button type="button" className="shrink-0 text-gray-400" aria-label="その他">
        <MoreIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
