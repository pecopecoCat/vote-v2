"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import BottomNav from "../components/BottomNav";
import VoteCard from "../components/VoteCard";
import { getCreatedVotes } from "../data/createdVotes";
import { voteCardsData, CARD_BACKGROUND_IMAGES } from "../data/voteCards";
import { getAllActivity, getMergedCounts, getCardIdsUserCommentedOn, getActivity, type CardActivity, type VoteComment } from "../data/voteCardActivity";
import { getFavoriteTags, getFavoriteTagsUpdatedEventName } from "../data/favoriteTags";
import {
  getCollections,
  getCollectionsUpdatedEventName,
  isCardInAnyCollection,
  createCollection,
  type Collection,
  type CollectionVisibility,
} from "../data/collections";
import type { VoteCardData } from "../data/voteCards";
import type { CurrentUser } from "../components/VoteCard";
import VoteCardMini from "../components/VoteCardMini";
import BookmarkCollectionModal from "../components/BookmarkCollectionModal";

const VISIBILITY_LABEL: Record<CollectionVisibility, string> = {
  member: "メンバー限定",
  public: "公開",
  private: "非公開",
};

const MOCK_USER = {
  name: "love_nitaku",
  iconUrl: "/default-avatar.png",
  voteCount: 120,
  collectionCount: 4,
};

type ProfileTabId = "myVOTE" | "vote" | "bookmark" | "comment";

const MY_COMMENT_USER_NAME = "自分";

function formatCommentDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function ProfileCommentRow({ comment }: { comment: VoteComment }) {
  return (
    <div className="flex gap-3 border-b border-gray-100 py-3 last:border-b-0">
      <div className="shrink-0 overflow-hidden rounded-full">
        <span className="flex h-10 w-10 overflow-hidden rounded-full bg-gray-200">
          <img src={comment.user.iconUrl ?? "/default-avatar.png"} alt="" className="h-full w-full object-cover" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800">{comment.user.name}</p>
        <p className="mt-0.5 text-sm text-[#191919]">{comment.text}</p>
        <p className="mt-1 text-xs text-gray-500">{formatCommentDate(comment.date)}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <img src="/icons/comment.svg" alt="" className="h-4 w-4" />
            0
          </span>
          <span className="flex items-center gap-1">
            <img src="/icons/good.svg" alt="" className="h-4 w-4" />
            0
          </span>
        </div>
      </div>
      <button type="button" className="shrink-0 text-gray-400" aria-label="その他" onClick={(e) => e.stopPropagation()}>
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>
    </div>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M7 10l5 5 5-5H7z" />
    </svg>
  );
}

function backgroundForCard(card: VoteCardData, cardId: string): string {
  if (card.backgroundImageUrl) return card.backgroundImageUrl;
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = ((h << 5) - h + cardId.charCodeAt(i)) | 0;
  return CARD_BACKGROUND_IMAGES[Math.abs(h) % CARD_BACKGROUND_IMAGES.length];
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTabId>("vote");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activity, setActivity] = useState<Record<string, CardActivity>>({});
  const [favoriteTags, setFavoriteTags] = useState<string[]>([]);
  /** Bookmark タブでコレクション or ALL を選択中。null = TOP（リスト表示） */
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<null | "all" | string>(null);
  /** ブックマーク先選択モーダルを開くカードID */
  const [modalCardId, setModalCardId] = useState<string | null>(null);

  useEffect(() => {
    setCollections(getCollections());
  }, []);

  useEffect(() => {
    setActivity(getAllActivity());
  }, []);

  useEffect(() => {
    setFavoriteTags(getFavoriteTags());
    const eventName = getFavoriteTagsUpdatedEventName();
    const handler = () => setFavoriteTags(getFavoriteTags());
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  useEffect(() => {
    const eventName = getCollectionsUpdatedEventName();
    const handler = () => setCollections(getCollections());
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  const currentUser: CurrentUser = { type: "sns", name: MOCK_USER.name, iconUrl: MOCK_USER.iconUrl };

  const createdVotes = useMemo(() => (typeof window !== "undefined" ? getCreatedVotes() : []), []);

  const seedCards = useMemo(
    () => voteCardsData.map((c, i) => ({ ...c, id: `seed-${i}` })),
    []
  );

  const allCards = useMemo(
    () => [...createdVotes, ...seedCards],
    [createdVotes, seedCards]
  );

  const votedCards = useMemo(
    () => allCards.filter((c) => activity[c.id ?? ""]?.userSelectedOption),
    [allCards, activity]
  );

  const allBookmarkedIds = useMemo(() => {
    const set = new Set<string>();
    collections.forEach((c) => c.cardIds.forEach((id) => set.add(id)));
    return Array.from(set);
  }, [collections]);
  const bookmarkedCards = useMemo(
    () => allCards.filter((c) => allBookmarkedIds.includes(c.id ?? "")),
    [allCards, allBookmarkedIds]
  );

  const commentedCardIds = useMemo(() => getCardIdsUserCommentedOn(), [activity]);

  const tabLabels: { id: ProfileTabId; label: string }[] = [
    { id: "myVOTE", label: "myVOTE" },
    { id: "vote", label: "投票" },
    { id: "bookmark", label: "Bookmark" },
    { id: "comment", label: "コメント" },
  ];

  const voteCount = createdVotes.length;
  const collectionCount = collections.length;

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-20">
      {/* 黄色ヘッダー */}
      <div className="bg-[#FFE100] px-[5.333vw] pt-4 pb-[15px]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_0_4px_rgba(0,0,0,0.1)]"
            >
              <img
                src={MOCK_USER.iconUrl}
                alt=""
                className="h-full w-full object-cover"
                width={56}
                height={56}
              />
            </div>
            <div>
              <p className="font-bold text-gray-900">{MOCK_USER.name}</p>
              <p className="text-sm font-bold text-gray-900">
                {voteCount} VOTE · {collectionCount} COLLECTION
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center text-gray-900"
            aria-label="設定"
          >
            <img src="/icons/icon_setting.svg" alt="" className="h-6 w-6" width={20} height={20} />
          </Link>
        </div>

        {/* 横棒：横幅100%（ビューポート幅）・お気に入りタグの上 */}
        <div className="mt-4 w-screen relative left-1/2 -translate-x-1/2">
          <div className="h-px w-full bg-[#EDC229]" aria-hidden />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm font-bold text-gray-900">
              <img src="/icons/heart.svg" alt="" className="h-4 w-4" width={18} height={16} />
              お気に入りタグ
            </span>
            <button type="button" className="text-sm font-bold text-gray-700 no-underline">
              編集
            </button>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {favoriteTags.map((tag) => (
              <Link
                key={tag}
                href={`/search?tag=${encodeURIComponent(tag)}`}
                className="shrink-0 rounded-full bg-[#FFEB3B]/80 px-4 py-2 text-sm font-medium text-gray-900"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* タブバー */}
      <nav className="flex bg-white" aria-label="マイページタブ">
        {tabLabels.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 flex-col pt-[14.4px] pb-[11.4px] text-sm font-bold ${
              activeTab === id ? "text-gray-900" : "text-gray-500"
            }`}
          >
            <span className="flex-1" aria-hidden />
            <span className="relative inline-block">
              {label}
              {activeTab === id && (
                <span
                  className="absolute -bottom-[11.4px] left-0 right-0 h-[3px] w-full bg-[#FFE100]"
                  aria-hidden
                />
              )}
            </span>
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-lg bg-[#F1F1F1] px-[5.333vw] pb-6 pt-4">
        {activeTab === "myVOTE" && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-600">新着順</span>
              <button type="button" className="flex items-center gap-1 text-sm text-gray-700">
                <ChevronDownIcon className="h-4 w-4 text-[#FFE100]" />
              </button>
            </div>
            {createdVotes.length === 0 ? (
              <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-500">作ったVOTEがまだありません。</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {createdVotes.map((card) => {
                  const cardId = card.id ?? card.question;
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
                      bookmarked={isCardInAnyCollection(cardId)}
                      onBookmarkClick={setModalCardId}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "vote" && (
          <>
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
              <span className="text-sm font-bold text-gray-600">新着順</span>
              <button type="button" className="flex items-center gap-1 text-sm text-gray-700">
                <ChevronDownIcon className="h-4 w-4 text-[#FFE100]" />
              </button>
            </div>
            {votedCards.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-500">投票したVOTEがここに表示されます。</p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {votedCards.map((card) => {
                  const cardId = card.id ?? card.question;
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
                      patternType={card.patternType}
                      question={card.question}
                      optionA={card.optionA}
                      optionB={card.optionB}
                      countA={merged.countA}
                      countB={merged.countB}
                      commentCount={merged.commentCount}
                      tags={card.tags}
                      currentUser={currentUser}
                      cardId={cardId}
                      initialSelectedOption={act?.userSelectedOption ?? null}
                      bookmarked={isCardInAnyCollection(cardId)}
                      onBookmarkClick={setModalCardId}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "bookmark" && (
          <>
            {selectedBookmarkId == null ? (
              /* Bookmark TOP: コレクションリスト */
              <div className="flex flex-col gap-0">
                {/* ALL 行 */}
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
                  onClick={() => setSelectedBookmarkId("all")}
                >
                  <span className="text-sm font-bold text-gray-900">ALL</span>
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </button>
                <p className="mb-2 mt-3 text-sm font-bold text-gray-900">コレクション</p>
                <div className="flex flex-col gap-2">
                  {collections.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left shadow-sm"
                      onClick={() => setSelectedBookmarkId(col.id)}
                    >
                      <span
                        className="h-10 w-10 shrink-0 rounded-full"
                        style={{ backgroundColor: col.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#191919]">{col.name}</p>
                        <p className="text-xs text-gray-500">
                          登録数 {col.cardIds.length}件 · {VISIBILITY_LABEL[col.visibility]}
                        </p>
                      </div>
                      <svg className="h-5 w-5 shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-900"
                  onClick={() => {
                    const name = window.prompt("コレクション名");
                    if (name != null && name.trim()) {
                      createCollection(name.trim());
                      setCollections(getCollections());
                    }
                  }}
                >
                  新しいコレクションを追加
                </button>
              </div>
            ) : (
              /* コレクション or ALL 選択時: カード一覧 */
              <>
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center text-gray-600"
                    aria-label="戻る"
                    onClick={() => setSelectedBookmarkId(null)}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                  </button>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedBookmarkId === "all" ? "ALL" : collections.find((c) => c.id === selectedBookmarkId)?.name ?? "コレクション"}
                  </span>
                </div>
                {(() => {
                  const ids = selectedBookmarkId === "all"
                    ? allBookmarkedIds
                    : (collections.find((c) => c.id === selectedBookmarkId)?.cardIds ?? []);
                  const cardsToShow = allCards.filter((c) => ids.includes(c.id ?? ""));
                  if (cardsToShow.length === 0) {
                    return (
                      <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                        <p className="text-sm text-gray-500">
                          {selectedBookmarkId === "all" ? "ブックマークした投稿がここに表示されます。" : "このコレクションにはまだ投稿がありません。"}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-col gap-4">
                      {cardsToShow.map((card) => {
                        const cardId = card.id ?? card.question;
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
                            bookmarked={isCardInAnyCollection(cardId)}
                            onBookmarkClick={setModalCardId}
                          />
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}

        {activeTab === "comment" && (
          <>
            {commentedCardIds.length === 0 ? (
              <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-500">コメントしたVOTEがここに表示されます。</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {commentedCardIds.map((cardId) => {
                  const card = allCards.find((c) => (c.id ?? c.question) === cardId);
                  if (!card) return null;
                  const act = getActivity(cardId);
                  const merged = getMergedCounts(
                    card.countA ?? 0,
                    card.countB ?? 0,
                    card.commentCount ?? 0,
                    act
                  );
                  const myComments = (act.comments ?? []).filter((c) => c.user?.name === MY_COMMENT_USER_NAME);
                  return (
                    <Link key={cardId} href={`/comments/${cardId}`} className="block">
                      <div className="rounded-2xl bg-white shadow-sm">
                        <VoteCardMini
                          backgroundImageUrl={backgroundForCard(card, cardId)}
                          patternType={card.patternType ?? "yellow-loops"}
                          question={card.question}
                          optionA={card.optionA}
                          optionB={card.optionB}
                          countA={merged.countA}
                          countB={merged.countB}
                          commentCount={merged.commentCount}
                          selectedSide={act.userSelectedOption}
                          userIconUrl={currentUser.iconUrl ?? "/default-avatar.png"}
                        />
                        <div className="border-t border-gray-100 px-[5.333vw] py-3">
                          {myComments.map((comment) => (
                            <ProfileCommentRow key={comment.id} comment={comment} />
                          ))}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav activeId="profile" />

      {modalCardId != null && (
        <BookmarkCollectionModal
          cardId={modalCardId}
          onClose={() => setModalCardId(null)}
          onCollectionsUpdated={() => setCollections(getCollections())}
        />
      )}
    </div>
  );
}
