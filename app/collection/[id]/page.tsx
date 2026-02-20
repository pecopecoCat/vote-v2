"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import VoteCard from "../../components/VoteCard";
import CardOptionsModal from "../../components/CardOptionsModal";
import BookmarkCollectionModal from "../../components/BookmarkCollectionModal";
import BottomNav from "../../components/BottomNav";
import Checkbox from "../../components/Checkbox";
import {
  getCollectionById,
  getCollections,
  getCollectionsUpdatedEventName,
  getPinnedCollectionIds,
  isOtherUsersCollection,
  togglePinnedCollection,
  type Collection,
  type CollectionVisibility,
} from "../../data/collections";
import { isCardBookmarked } from "../../data/bookmarks";
import { getCollectionGradientClass } from "../../data/search";
import { getCreatedVotesForTimeline } from "../../data/createdVotes";
import { voteCardsData, CARD_BACKGROUND_IMAGES } from "../../data/voteCards";
import { getAuth, getAuthUpdatedEventName } from "../../data/auth";
import {
  getAllActivity,
  getMergedCounts,
  getCardIdsUserCommentedOn,
  type CardActivity,
} from "../../data/voteCardActivity";
import type { VoteCardData } from "../../data/voteCards";
import type { CurrentUser } from "../../components/VoteCard";

const VISIBILITY_LABEL: Record<CollectionVisibility, string> = {
  member: "メンバー限定",
  public: "公開",
  private: "非公開",
};

function getCardByStableId(id: string): VoteCardData | null {
  if (id.startsWith("seed-")) {
    const index = parseInt(id.slice(5), 10);
    if (Number.isNaN(index) || index < 0 || index >= voteCardsData.length) return null;
    return { ...voteCardsData[index], id: `seed-${index}` };
  }
  if (id.startsWith("created-")) {
    if (typeof window === "undefined") return null;
    const created = getCreatedVotesForTimeline();
    return created.find((c) => c.id === id) ?? null;
  }
  const index = parseInt(id, 10);
  if (!Number.isNaN(index) && index >= 0 && index < voteCardsData.length) {
    return { ...voteCardsData[index], id: `seed-${index}` };
  }
  return null;
}

function backgroundForCard(card: VoteCardData, cardId: string): string {
  if (card.backgroundImageUrl) return card.backgroundImageUrl;
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = ((h << 5) - h + cardId.charCodeAt(i)) | 0;
  return CARD_BACKGROUND_IMAGES[Math.abs(h) % CARD_BACKGROUND_IMAGES.length];
}

export default function CollectionPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [activity, setActivity] = useState<Record<string, CardActivity>>({});
  const [showVoted, setShowVoted] = useState(true);
  const [cardOptionsCardId, setCardOptionsCardId] = useState<string | null>(null);
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [auth, setAuth] = useState(() => getAuth());
  const currentUser: CurrentUser = auth.isLoggedIn && auth.user
    ? { type: "sns", name: auth.user.name, iconUrl: auth.user.iconUrl }
    : { type: "guest" };

  useEffect(() => {
    setAuth(getAuth());
  }, []);
  useEffect(() => {
    setCollections(getCollections());
    setPinnedIds(getPinnedCollectionIds());
  }, [id]);
  useEffect(() => {
    const handler = () => {
      setCollections(getCollections());
      setPinnedIds(getPinnedCollectionIds());
    };
    const eventName = getCollectionsUpdatedEventName();
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  useEffect(() => {
    setActivity(getAllActivity());
  }, []);

  useEffect(() => {
    const handler = () => {
      setAuth(getAuth());
      setActivity(getAllActivity());
    };
    window.addEventListener(getAuthUpdatedEventName(), handler);
    return () => window.removeEventListener(getAuthUpdatedEventName(), handler);
  }, []);

  const collection = useMemo(() => getCollectionById(id), [id, collections]);
  const isPinned = pinnedIds.includes(id);
  const commentedCardIds = useMemo(() => getCardIdsUserCommentedOn(), [activity]);

  const cardsInCollection = useMemo(() => {
    if (!collection) return [];
    return collection.cardIds
      .map((cardId) => {
        const card = getCardByStableId(cardId);
        return card ? { card, cardId } : null;
      })
      .filter((x): x is { card: VoteCardData; cardId: string } => x != null);
  }, [collection]);

  const cardsToShow = useMemo(() => {
    if (showVoted) return cardsInCollection;
    return cardsInCollection.filter(({ cardId }) => activity[cardId]?.userSelectedOption);
  }, [cardsInCollection, showVoted, activity]);

  const handleTogglePin = () => {
    togglePinnedCollection(id);
    setPinnedIds(getPinnedCollectionIds());
  };

  if (!collection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F1F1]">
        <div className="px-6 text-center">
          <p className="text-gray-600">コレクションが見つかりませんでした。</p>
          <Link href="/profile" className="mt-4 inline-block text-blue-600 underline">
            マイページへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-20">
      {/* ヘッダー：設定グラデーション/カラー背景・コレクション名・戻る・ピン（全画面共通） */}
      <header
        className={`flex items-center justify-between px-4 py-3 ${collection.gradient ? `bg-gradient-to-r ${getCollectionGradientClass(collection.gradient)}` : ""}`}
        style={collection.gradient ? undefined : { backgroundColor: collection.color }}
      >
        <Link
          href={isOtherUsersCollection(id) ? "/search" : "/profile"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-gray-900"
          aria-label="戻る"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-bold text-white drop-shadow-sm">
          {collection.name}
        </h1>
        <button
          type="button"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isPinned ? "bg-[#FFE100]" : "bg-white/90"}`}
          aria-label={isPinned ? "ピン留めを外す" : "検索画面にピン留め"}
          onClick={handleTogglePin}
        >
          <img
            src="/icons/icon_pin.svg"
            alt=""
            className="h-5 w-5"
            width={22}
            height={22}
          />
        </button>
      </header>

      <main className="mx-auto max-w-lg px-[5.333vw] pb-6 pt-4">
        {/* 登録数・公開設定 */}
        <p className="text-sm text-gray-600">
          登録数 {collection.cardIds.length}件
          {collection.visibility !== "public" && ` · ${VISIBILITY_LABEL[collection.visibility]}`}
        </p>

        {/* 新着順・投票済みを表示（mypageのmyVOTEタブと同じ見た目） */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          >
            新着順
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFE100]">
              <img
                src="/icons/icon_b_arrow.svg"
                alt=""
                className="h-2.5 w-2.5 shrink-0"
                width={10}
                height={8}
              />
            </span>
          </button>
          <Checkbox
            checked={showVoted}
            onChange={setShowVoted}
            label="投票済みを表示"
          />
        </div>

        {/* カード一覧 */}
        {cardsToShow.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              {showVoted
                ? "このコレクションにはまだ投稿がありません。"
                : "投票済みの投稿がありません。"}
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {cardsToShow.map(({ card, cardId }) => {
              const act = activity[cardId];
              const merged = getMergedCounts(
                card.countA ?? 0,
                card.countB ?? 0,
                card.commentCount ?? 0,
                act ?? { countA: 0, countB: 0, comments: [] }
              );
              return (
                <VoteCard
                  key={cardId}
                  backgroundImageUrl={backgroundForCard(card, cardId)}
                  patternType={card.patternType ?? "yellow-loops"}
                  question={card.question}
                  optionA={card.optionA}
                  optionB={card.optionB}
                  countA={merged.countA}
                  countB={merged.countB}
                  commentCount={merged.commentCount}
                  tags={card.tags}
                  readMoreText={card.readMoreText}
                  creator={card.creator}
                  currentUser={currentUser}
                  cardId={cardId}
                  bookmarked={isCardBookmarked(cardId)}
                  hasCommented={commentedCardIds.includes(cardId)}
                  initialSelectedOption={act?.userSelectedOption ?? null}
                  onBookmarkClick={setModalCardId}
                  onMoreClick={setCardOptionsCardId}
                  visibility={card.visibility}
                  optionAImageUrl={card.optionAImageUrl}
                  optionBImageUrl={card.optionBImageUrl}
                />
              );
            })}
          </div>
        )}
      </main>

      <BottomNav activeId="profile" />

      {cardOptionsCardId != null && (
        <CardOptionsModal
          cardId={cardOptionsCardId}
          onClose={() => setCardOptionsCardId(null)}
        />
      )}

      {modalCardId != null && (
        <BookmarkCollectionModal
          cardId={modalCardId}
          onClose={() => setModalCardId(null)}
          isLoggedIn={auth.isLoggedIn}
        />
      )}
    </div>
  );
}
