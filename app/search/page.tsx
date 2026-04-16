"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppHeader from "../components/AppHeader";
import CollectionCard from "../components/CollectionCard";
import RecommendedTags from "../components/RecommendedTags";
import VoteCard from "../components/VoteCard";
import CardOptionsModal from "../components/CardOptionsModal";
import ReportViolationModal from "../components/ReportViolationModal";
import BookmarkCollectionModal from "../components/BookmarkCollectionModal";
import TagMenuModal, { type TagMenuVariant } from "../components/TagMenuModal";
import Checkbox from "../components/Checkbox";
import NewestOldestSortDropdown from "../components/NewestOldestSortDropdown";
import EmptyStatePanel from "../components/EmptyStatePanel";
import BottomNav from "../components/BottomNav";
import type { CurrentUser } from "../components/VoteCard";
import type { VoteCardData } from "../data/voteCards";
import { voteCardsData, CARD_BACKGROUND_IMAGES } from "../data/voteCards";
import { getMergedCounts, isCommentAuthoredByCurrentUser, type CardActivity } from "../data/voteCardActivity";
import { useSharedData } from "../context/SharedDataContext";
import {
  getFavoriteTags,
  toggleFavoriteTag,
  isFavoriteTag,
  getFavoriteTagsUpdatedEventName,
} from "../data/favoriteTags";
import { isHiddenTag } from "../data/hiddenTags";
import {
  getCollections,
  getOtherUsersCollections,
  getPinnedCollectionIds,
  getCollectionsUpdatedEventName,
  PINNED_UPDATED_EVENT,
} from "../data/collections";
import { isCardBookmarked } from "../data/bookmarks";
import { getShowVoted, setShowVoted } from "../data/showVotedPreference";
import { getAuth, getAuthUpdatedEventName, getCurrentActivityUserId } from "../data/auth";
import {
  getHiddenUserIds,
  addHiddenUser,
  getHiddenUsersUpdatedEventName,
} from "../data/hiddenUsers";
import {
  getTrendingTagsByScore,
  popularCollections,
  searchCollections,
  trendingTags,
  type CollectionGradient,
} from "../data/search";

/** ピン留めコレクション用グラデーションのローテーション（検索画面はグラデーション表示に統一） */
const PINNED_GRADIENTS: CollectionGradient[] = [
  "blue-cyan",
  "pink-purple",
  "purple-pink",
  "orange-yellow",
  "green-yellow",
  "cyan-aqua",
];

/** タグでフィルター（tag 指定時）、新着順／古い順でソート */
function filterCardsByTag(
  cards: VoteCardData[],
  tag: string | null,
  sortOrder: "newest" | "oldest"
): VoteCardData[] {
  if (!tag) return [];
  const filtered = cards.filter((c) => c.tags?.includes(tag));
  return [...filtered].sort((a, b) =>
    sortOrder === "newest"
      ? (b.createdAt ?? "0").localeCompare(a.createdAt ?? "0")
      : (a.createdAt ?? "0").localeCompare(b.createdAt ?? "0")
  );
}

/** セクション見出し（グレーの横バー・中央テキスト） */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#E5E7EB] py-2.5 text-center">
      <h2 className="text-sm font-medium text-gray-900">{children}</h2>
    </div>
  );
}

/** タグ1行（タグ名・登録数・縦三点メニュー） */
function TagRow({
  tag,
  count,
  variant,
  onMenuClick,
}: {
  tag: string;
  count: number;
  variant: TagMenuVariant;
  onMenuClick?: (tag: string, variant: TagMenuVariant) => void;
}) {
  return (
    <Link
      href={`/search?tag=${encodeURIComponent(tag)}`}
      className="flex items-center gap-2 border-b border-gray-100 py-3 last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900">{tag}</p>
        <p className="text-xs text-gray-500">登録数 {count}件</p>
      </div>
      <button
        type="button"
        className="shrink-0 p-1 text-[#191919] hover:opacity-75"
        aria-label="メニュー"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMenuClick?.(tag, variant);
        }}
      >
        <EllipsisIcon className="h-5 w-5" />
      </button>
    </Link>
  );
}

function EllipsisIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const tagFromUrl = searchParams.get("tag") ?? "";
  const [searchValue, setSearchValue] = useState(tagFromUrl);
  const [activeTab, setActiveTab] = useState<"trending" | "favorite">("trending");
  const [showVoted, setShowVotedState] = useState(() => getShowVoted());
  /** ハッシュタグ一覧の並び（マイページ等と同じプルダウン） */
  const [tagListSortOrder, setTagListSortOrder] = useState<"newest" | "oldest">("newest");
  const handleShowVotedChange = useCallback((value: boolean) => {
    setShowVoted(value);
    setShowVotedState(value);
  }, []);
  const shared = useSharedData();
  const { createdVotesForTimeline, activity, addVote: sharedAddVote } = shared;
  const [favoriteTags, setFavoriteTags] = useState<string[]>([]);
  const [cardOptionsCardId, setCardOptionsCardId] = useState<string | null>(null);
  const [cardOptionsIsOwnCard, setCardOptionsIsOwnCard] = useState(false);
  const [reportCardId, setReportCardId] = useState<string | null>(null);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>(() => getHiddenUserIds());
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [tagMenu, setTagMenu] = useState<{ tag: string; variant: TagMenuVariant } | null>(null);
  const [hiddenTagsVersion, setHiddenTagsVersion] = useState(0);
  /** 注目タグの表示件数（初期10件、もっと表示するで10件ずつ追加） */
  const [trendingTagsVisibleCount, setTrendingTagsVisibleCount] = useState(10);
  const [pinnedCollectionIds, setPinnedCollectionIds] = useState<string[]>([]);
  const [collections, setCollections] = useState<ReturnType<typeof getCollections>>([]);
  const [auth, setAuth] = useState(() => getAuth());
  const isLoggedIn = auth.isLoggedIn;
  const currentUser = useMemo<CurrentUser>(
    () =>
      auth.isLoggedIn && auth.user
        ? { type: "sns", name: auth.user.name, iconUrl: auth.user.iconUrl }
        : { type: "guest" },
    [auth.isLoggedIn, auth.user]
  );
  useEffect(() => {
    setAuth(getAuth());
    setFavoriteTags(getFavoriteTags());
    setCollections(getCollections());
    setPinnedCollectionIds(getPinnedCollectionIds());
    const handler = () => {
      setAuth(getAuth());
      setFavoriteTags(getFavoriteTags());
      setCollections(getCollections());
      setPinnedCollectionIds(getPinnedCollectionIds());
    };
    window.addEventListener(getAuthUpdatedEventName(), handler);
    return () => window.removeEventListener(getAuthUpdatedEventName(), handler);
  }, []);

  useEffect(() => {
    setFavoriteTags(getFavoriteTags());
    const eventName = getFavoriteTagsUpdatedEventName();
    const handler = () => setFavoriteTags(getFavoriteTags());
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  /** ハッシュタグタップで開いたとき（?tag=xxx）→ 従来のカード一覧。虫眼鏡タップ（/search）→ 新しい検索画面 */
  const isTagFilterView = tagFromUrl.length > 0;

  useEffect(() => {
    setSearchValue(tagFromUrl);
  }, [tagFromUrl]);

  useEffect(() => {
    setTagListSortOrder("newest");
  }, [tagFromUrl]);

  /**
   * 「投票済みを表示」OFF のとき、投票直後はカードをタイムラインに残す（結果表示のまま）。
   * タグ切替・別ページ遷移・リロードで state が消えたら通常フィルタに戻る。
   */
  const [keepVotedCardVisible, setKeepVotedCardVisible] = useState<Record<string, true>>({});
  useEffect(() => {
    setKeepVotedCardVisible({});
  }, [tagFromUrl]);

  const query = searchValue.trim();
  const isSearching = query.length > 0;
  const matchedCollectionsRaw = useMemo(() => searchCollections(query), [query]);
  /** 検索時コレクション：ピン留めを上に表示 */
  const matchedCollections = useMemo(
    () =>
      [...matchedCollectionsRaw].sort((a, b) => {
        const aPin = pinnedCollectionIds.includes(a.id);
        const bPin = pinnedCollectionIds.includes(b.id);
        if (aPin && !bPin) return -1;
        if (!aPin && bPin) return 1;
        if (aPin && bPin)
          return pinnedCollectionIds.indexOf(a.id) - pinnedCollectionIds.indexOf(b.id);
        return 0;
      }),
    [matchedCollectionsRaw, pinnedCollectionIds]
  );

  /** 人気コレクション（他＋自分の）：ピン留めを上に表示 */
  const collectionsForSection = useMemo(() => {
    const other = getOtherUsersCollections();
    const combined = [...other, ...collections];
    return combined.sort((a, b) => {
      const aPin = pinnedCollectionIds.includes(a.id);
      const bPin = pinnedCollectionIds.includes(b.id);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      if (aPin && bPin)
        return pinnedCollectionIds.indexOf(a.id) - pinnedCollectionIds.indexOf(b.id);
      return 0;
    });
  }, [collections, pinnedCollectionIds]);

  /** 注目タグ用の全カード（作成VOTE + シード） */
  const allCardsForTags = useMemo(() => {
    const seedWithId = voteCardsData.map((c, i) => ({ ...c, id: `seed-${i}` }));
    return [...createdVotesForTimeline, ...seedWithId];
  }, [createdVotesForTimeline]);

  useEffect(() => {
    const handler = () => setHiddenUserIds(getHiddenUserIds());
    window.addEventListener(getHiddenUsersUpdatedEventName(), handler);
    return () => window.removeEventListener(getHiddenUsersUpdatedEventName(), handler);
  }, []);

  /** 非表示ユーザーを除いたカード（タグフィルター・表示用） */
  const allCardsForTagsFiltered = useMemo(
    () =>
      allCardsForTags.filter(
        (c) => !c.createdByUserId || !hiddenUserIds.includes(c.createdByUserId)
      ),
    [allCardsForTags, hiddenUserIds]
  );

  /** 注目タグ（スコア順：投票+1, コメント+3, bookmark+5, 新着+2, お気に入り+3） */
  const trendingTagsByScore = useMemo(
    () => getTrendingTagsByScore(allCardsForTagsFiltered, activity, favoriteTags),
    [allCardsForTagsFiltered, activity, favoriteTags]
  );

  /** 注目タグ（興味がないで非表示にしたタグを除く） */
  const displayedTrendingTags = useMemo(
    () => trendingTagsByScore.filter((t) => !isHiddenTag(t.tag)),
    [trendingTagsByScore, hiddenTagsVersion]
  );

  /** 検索時：「query」が含まれるタグ（スコア順の一覧から抽出） */
  const matchedTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return trendingTagsByScore.filter((t) => t.tag.toLowerCase().includes(q));
  }, [query, trendingTagsByScore]);

  /** ハッシュタグフィルター用の全カード（作成VOTE + シード、ID付き） */
  const allCardsForTagFilter = useMemo(() => {
    const seedWithId = voteCardsData.map((c, i) => ({ ...c, id: c.id ?? `seed-${i}` }));
    return [...createdVotesForTimeline, ...seedWithId];
  }, [createdVotesForTimeline]);

  const allCardsForTagFilterFiltered = useMemo(
    () =>
      allCardsForTagFilter.filter(
        (c) => !c.createdByUserId || !hiddenUserIds.includes(c.createdByUserId)
      ),
    [allCardsForTagFilter, hiddenUserIds]
  );

  const filteredCards = useMemo(
    () =>
      filterCardsByTag(
        allCardsForTagFilterFiltered,
        isTagFilterView ? tagFromUrl : null,
        tagListSortOrder
      ),
    [allCardsForTagFilterFiltered, isTagFilterView, tagFromUrl, tagListSortOrder]
  );

  const commentedCardIdSet = useMemo(() => {
    const set = new Set<string>();
    const opts = {
      isLoggedIn: auth.isLoggedIn,
      displayName: auth.user?.name,
    };
    for (const [cid, a] of Object.entries(activity)) {
      if ((a.comments ?? []).some((c) => isCommentAuthoredByCurrentUser(c.user?.name, opts))) {
        set.add(cid);
      }
    }
    return set;
  }, [activity, auth.isLoggedIn, auth.user?.name]);

  /** 検索結果タイムライン用：実際にあるコレクションから1件ランダム */
  const randomCollectionForTimeline = useMemo(() => {
    const other = getOtherUsersCollections().map((c) => ({
      id: c.id,
      title: c.name,
      gradient: (c.gradient ?? "orange-yellow") as CollectionGradient,
    }));
    const mine = collections.map((c) => ({
      id: c.id,
      title: c.name,
      gradient: (c.gradient ?? "orange-yellow") as CollectionGradient,
    }));
    const pool = [...popularCollections, ...other, ...mine];
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [collections]);

  useEffect(() => {
    setPinnedCollectionIds(getPinnedCollectionIds());
    setCollections(getCollections());
  }, []);
  useEffect(() => {
    const handler = () => {
      setPinnedCollectionIds(getPinnedCollectionIds());
      setCollections(getCollections());
    };
    window.addEventListener(PINNED_UPDATED_EVENT, handler);
    window.addEventListener(getCollectionsUpdatedEventName(), handler);
    return () => {
      window.removeEventListener(PINNED_UPDATED_EVENT, handler);
      window.removeEventListener(getCollectionsUpdatedEventName(), handler);
    };
  }, []);
  /** ON: 全カード表示（投票済み含む） / OFF: ユーザーが投票していないカードのみ */
  const cardsToShow = useMemo(() => {
    if (showVoted) return filteredCards;
    return filteredCards.filter((card) => {
      const cardId = card.id ?? `seed-${voteCardsData.indexOf(card)}`;
      if (keepVotedCardVisible[cardId]) return true;
      return !activity[cardId]?.userSelectedOption;
    });
  }, [filteredCards, showVoted, activity, keepVotedCardVisible]);
  const backgroundPerCard = useMemo(
    () =>
      voteCardsData.map(
        () =>
          CARD_BACKGROUND_IMAGES[
            Math.floor(Math.random() * CARD_BACKGROUND_IMAGES.length)
          ]
      ),
    []
  );
  const handleVote = useCallback(
    (cardId: string, option: "A" | "B") => {
      if (!showVoted) {
        setKeepVotedCardVisible((prev) => ({ ...prev, [cardId]: true }));
      }
      void sharedAddVote(cardId, option);
    },
    [sharedAddVote, showVoted]
  );

  const handleTagFilterCardMoreClick = useCallback(
    (cardId: string) => {
      setCardOptionsCardId(cardId);
      const card = allCardsForTagFilterFiltered.find((c) => (c.id ?? c.question) === cardId);
      setCardOptionsIsOwnCard(card?.createdByUserId === getCurrentActivityUserId());
    },
    [allCardsForTagFilterFiltered]
  );

  return (
    <div
      className={`min-h-screen pb-[50px] ${isTagFilterView ? "bg-[#F1F1F1]" : "bg-white"}`}
    >
      {/* 虫眼鏡で開いた時→(2)検索 / ハッシュタグタップで開いた時→(3)ハッシュタグ */}
      <AppHeader
        type={isTagFilterView ? "hashtag" : "search"}
        value={searchValue}
        onChange={setSearchValue}
        backHref={isTagFilterView ? "/search" : "/"}
        {...(isTagFilterView && {
          onFavoriteClick: (tag) => {
            toggleFavoriteTag(tag);
            setFavoriteTags(getFavoriteTags());
          },
          isFavorite: isFavoriteTag(searchValue.trim()),
        })}
      />

      {/* ハッシュタグから開いたとき：従来のカード一覧（新着順・投票済みを表示） */}
      {isTagFilterView && (
        <>
          <div className="sticky top-[64px] z-10 flex items-center justify-between border-b border-gray-200 bg-[#F1F1F1] px-[5.333vw] py-3">
            <NewestOldestSortDropdown value={tagListSortOrder} onChange={setTagListSortOrder} />
            <Checkbox
              checked={showVoted}
              onChange={handleShowVotedChange}
              label="投票済みを表示"
            />
          </div>
          <main className="mx-auto max-w-lg px-[5.333vw] pb-[50px] pt-6">
            <div className="flex flex-col gap-[5.333vw]">
              {cardsToShow.length === 0 ? (
                <EmptyStatePanel>
                  <p className="text-sm text-gray-600">
                    {tagFromUrl ? `#${tagFromUrl} の投稿はありません` : "タグを選ぶか検索してください"}
                  </p>
                </EmptyStatePanel>
              ) : (
                cardsToShow.map((card) => {
                  const index = voteCardsData.indexOf(card);
                  const cardId = card.id ?? `seed-${index}`;
                  const act = activity[cardId];
                  const merged = getMergedCounts(
                    card.countA ?? 0,
                    card.countB ?? 0,
                    card.commentCount ?? 0,
                    act ?? { countA: 0, countB: 0, comments: [] }
                  );
                  const bgUrl =
                    card.backgroundImageUrl ?? backgroundPerCard[Math.max(0, index)];
                  return (
                    <VoteCard
                      key={cardId}
                      backgroundImageUrl={bgUrl}
                      patternType={card.patternType}
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
                      hasCommented={commentedCardIdSet.has(cardId)}
                      initialSelectedOption={act?.userSelectedOption ?? null}
                      onVote={handleVote}
                      onBookmarkClick={setModalCardId}
                      onMoreClick={handleTagFilterCardMoreClick}
                      visibility={card.visibility}
                      optionAImageUrl={card.optionAImageUrl}
                      optionBImageUrl={card.optionBImageUrl}
                      periodEnd={card.periodEnd}
                    />
                  );
                })
              )}
              <RecommendedTags tags={trendingTags.map((t) => t.tag).slice(0, 10)} />
              {randomCollectionForTimeline && (
                <CollectionCard
                  key={randomCollectionForTimeline.id}
                  id={randomCollectionForTimeline.id}
                  title={randomCollectionForTimeline.title}
                  gradient={randomCollectionForTimeline.gradient}
                  titleVariant="blackBlock"
                  label="コレクション"
                  href={`/collection/${randomCollectionForTimeline.id}`}
                  timelineBanner
                />
              )}
            </div>
          </main>
          <BottomNav activeId="search" />
        </>
      )}

      {/* 虫眼鏡タップで開いたとき：新しい検索画面（注目タグ・人気コレクション・VOTEを作成） */}
      {!isTagFilterView && (
        <>
          {/* タブ：注目タグ / お気に入りタグ（お知らせページと同じデザイン・黄バー下50pxでグレーライン） */}
          {!isSearching && (
            <>
              <div className="w-full min-w-0">
                <nav className="flex w-full bg-white" aria-label="検索タブ">
                  <button
                    type="button"
                    onClick={() => setActiveTab("trending")}
                    className={`relative flex flex-1 min-w-0 flex-col pt-[14.4px] pb-[11.4px] text-sm font-bold ${
                      activeTab === "trending" ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    <span className="flex-1" aria-hidden />
                    <span className="inline-flex items-center justify-center gap-1">
                      <img src="/icons/icon_chumoku.svg" alt="" className="h-[9px] w-[18px] shrink-0" width={18} height={9} />
                      注目タグ
                    </span>
                    {activeTab === "trending" && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#FFE100]"
                        aria-hidden
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("favorite")}
                    className={`relative flex flex-1 min-w-0 flex-col pt-[14.4px] pb-[11.4px] text-sm font-bold ${
                      activeTab === "favorite" ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    <span className="flex-1" aria-hidden />
                    <span className="inline-flex items-center justify-center gap-1">
                      <img
                        src={favoriteTags.length > 0 ? "/icons/icon_heart_on_gray.svg" : "/icons/icon_heart.svg"}
                        alt=""
                        className="h-4 w-4 shrink-0"
                        width={18}
                        height={16}
                      />
                      お気に入りタグ
                    </span>
                    {activeTab === "favorite" && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#FFE100]"
                        aria-hidden
                      />
                    )}
                  </button>
                </nav>
              </div>
              {/* 黄バーのすぐ下にグレーライン（余白なし） */}
              <div className="h-px bg-[#E5E7EB]" aria-hidden />
            </>
          )}

          <main className="mx-auto max-w-lg bg-white pb-[50px]">
        {!isSearching ? (
          <>
            {/* 注目タグ（見出しなし・もっと表示すると黄バー間に10px） */}
            {activeTab === "trending" && (
              <section className="border-b border-gray-200 pt-2.5">
                <div className="px-[5.333vw]">
                  {displayedTrendingTags.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">検索候補がありません。</p>
                  ) : (
                    <>
                      {displayedTrendingTags.slice(0, trendingTagsVisibleCount).map((t) => (
                        <TagRow
                          key={t.tag}
                          tag={t.tag}
                          count={t.count}
                          variant="trending"
                          onMenuClick={(tag, variant) => setTagMenu({ tag, variant })}
                        />
                      ))}
                      {displayedTrendingTags.length > 10 && trendingTagsVisibleCount < displayedTrendingTags.length && (
                        <div className="mb-[50px] flex justify-center pb-3 pt-6">
                          <button
                            type="button"
                            className="inline-block text-center"
                            onClick={() => setTrendingTagsVisibleCount((prev) => prev + 10)}
                          >
                            <span className="text-sm font-medium text-gray-600">もっと表示する</span>
                            <span
                              className="mt-2.5 block h-0.5 w-full bg-[#FFE100]"
                              aria-hidden
                            />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {activeTab === "favorite" && (
              <section className="border-b border-gray-200 pt-2.5">
                <div className="px-[5.333vw]">
                  {!isLoggedIn ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-gray-700">
                        LINEでログインするとお気に入りタグを保存できるよ
                      </p>
                      <Link
                        href="/profile/login?returnTo=/search"
                        className="mt-6 block w-full max-w-md rounded-xl bg-[#FFE100] py-4 text-center text-base font-bold text-gray-900 hover:opacity-90"
                        aria-label="LINEでログインする"
                      >
                        LINEでログインする
                      </Link>
                    </div>
                  ) : favoriteTags.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">お気に入りタグはまだありません。</p>
                  ) : (
                    [...favoriteTags]
                      .map((tag) => ({
                        tag,
                        count: trendingTagsByScore.find((t) => t.tag === tag)?.count ?? 0,
                      }))
                      .sort((a, b) => b.count - a.count)
                      .map(({ tag, count }) => (
                        <TagRow
                          key={tag}
                          tag={tag}
                          count={count}
                          variant="favorite"
                          onMenuClick={(t, variant) => setTagMenu({ tag: t, variant })}
                        />
                      ))
                  )}
                </div>
              </section>
            )}

            {/* コレクション（他ユーザー登録分＋自分のコレクション・ピン留めを上に表示） */}
            <section>
              <div className="border-t border-gray-200 px-[5.333vw] pt-6">
                <h2 className="search-popular-collections-title text-left font-black text-gray-900">
                  人気コレクション
                </h2>
              </div>
              <div className="flex flex-col gap-3 px-[5.333vw] pb-2 pt-4">
                {collectionsForSection.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">
                    {isLoggedIn ? "コレクションがありません。マイページで作成しよう。" : "コレクションはありません。"}
                  </p>
                ) : (
                  collectionsForSection.map((col, i) => (
                    <CollectionCard
                      key={col.id}
                      id={col.id}
                      title={col.name}
                      gradient={col.gradient ?? PINNED_GRADIENTS[i % PINNED_GRADIENTS.length]}
                      showPin={pinnedCollectionIds.includes(col.id)}
                      popularBanner
                      href={`/collection/${col.id}`}
                    />
                  ))
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* 検索時：「検索語」が含まれるタグ */}
            <section className="border-b border-gray-200">
              <SectionHeader>「{query}」が含まれるタグ</SectionHeader>
              <div className="px-[5.333vw]">
                {matchedTags.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">検索候補がありません。</p>
                ) : (
                  matchedTags.map((t) => (
                    <TagRow
                      key={t.tag}
                      tag={t.tag}
                      count={t.count}
                      variant="trending"
                      onMenuClick={(tag, variant) => setTagMenu({ tag, variant })}
                    />
                  ))
                )}
              </div>
            </section>

            {/* 検索時：コレクション */}
            <section>
              <SectionHeader>コレクション</SectionHeader>
              <div className="flex flex-col gap-3 px-[5.333vw] py-4">
                {matchedCollections.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">検索候補がありません。</p>
                ) : (
                  matchedCollections.map((col) => (
                    <CollectionCard
                      key={col.id}
                      id={col.id}
                      title={col.title}
                      gradient={col.gradient}
                      showPin={col.showPin}
                      href={`/collection/${col.id}`}
                    />
                  ))
                )}
              </div>
            </section>
          </>
        )}
          </main>

          <BottomNav activeId="search" />
        </>
      )}

      {cardOptionsCardId != null && (
        <CardOptionsModal
          cardId={cardOptionsCardId}
          isOwnCard={cardOptionsIsOwnCard}
          onClose={() => setCardOptionsCardId(null)}
          onHide={(cardId) => {
            const card = allCardsForTagFilter.find(
              (c) => (c.id ?? c.question) === cardId
            );
            if (card?.createdByUserId) {
              addHiddenUser(card.createdByUserId);
              setHiddenUserIds(getHiddenUserIds());
            }
            setCardOptionsCardId(null);
          }}
          onReport={(cardId) => {
            setReportCardId(cardId);
            setCardOptionsCardId(null);
          }}
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

      {tagMenu != null && (
        <TagMenuModal
          tag={tagMenu.tag}
          variant={tagMenu.variant}
          onClose={() => setTagMenu(null)}
          onHiddenTagsUpdated={() => setHiddenTagsVersion((v) => v + 1)}
          onFavoriteTagsUpdated={() => setFavoriteTags(getFavoriteTags())}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">読み込み中...</div>}>
      <SearchContent />
    </Suspense>
  );
}
