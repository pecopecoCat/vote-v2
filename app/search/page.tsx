"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppHeader from "../components/AppHeader";
import CollectionCard from "../components/CollectionCard";
import RecommendedTags from "../components/RecommendedTags";
import VoteCard from "../components/VoteCard";
import Checkbox from "../components/Checkbox";
import BottomNav from "../components/BottomNav";
import type { CurrentUser } from "../components/VoteCard";
import type { VoteCardData } from "../data/voteCards";
import {
  voteCardsData,
  CARD_BACKGROUND_IMAGES,
  recommendedTagList,
} from "../data/voteCards";
import {
  getActivity,
  getAllActivity,
  addVote as persistVote,
  getMergedCounts,
  type CardActivity,
} from "../data/voteCardActivity";
import {
  getFavoriteTags,
  toggleFavoriteTag,
  isFavoriteTag,
} from "../data/favoriteTags";
import {
  trendingTags,
  popularCollections,
  searchTags,
  searchCollections,
} from "../data/search";

const demoCurrentUser: CurrentUser = { type: "guest" };

/** タグでフィルター（tag 指定時）、新着順でソート */
function filterCardsByTag(cards: VoteCardData[], tag: string | null): VoteCardData[] {
  if (!tag) return [];
  return [...cards]
    .filter((c) => c.tags?.includes(tag))
    .reverse();
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
}: {
  tag: string;
  count: number;
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
        className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
        aria-label="メニュー"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
  const [showVoted, setShowVoted] = useState(true);
  const [activity, setActivity] = useState<Record<string, CardActivity>>({});
  const [favoriteTags, setFavoriteTags] = useState<string[]>([]);

  useEffect(() => {
    setActivity(getAllActivity());
  }, []);

  useEffect(() => {
    setFavoriteTags(getFavoriteTags());
  }, []);

  /** ハッシュタグタップで開いたとき（?tag=xxx）→ 従来のカード一覧。虫眼鏡タップ（/search）→ 新しい検索画面 */
  const isTagFilterView = tagFromUrl.length > 0;

  useEffect(() => {
    setSearchValue(tagFromUrl);
  }, [tagFromUrl]);

  const query = searchValue.trim();
  const isSearching = query.length > 0;

  const matchedTags = useMemo(() => searchTags(query), [query]);
  const matchedCollections = useMemo(() => searchCollections(query), [query]);

  const filteredCards = useMemo(
    () => filterCardsByTag(voteCardsData, isTagFilterView ? tagFromUrl : null),
    [isTagFilterView, tagFromUrl]
  );
  /** ON: 全カード表示（投票済み含む） / OFF: ユーザーが投票していないカードのみ */
  const cardsToShow = useMemo(() => {
    if (showVoted) return filteredCards;
    return filteredCards.filter((card) => {
      const index = voteCardsData.indexOf(card);
      const id = `seed-${index}`;
      return !activity[id]?.userSelectedOption;
    });
  }, [filteredCards, showVoted, activity]);
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
  const handleVote = useCallback((cardId: string, option: "A" | "B") => {
    persistVote(cardId, option);
    setActivity((prev) => {
      const cur = prev[cardId] ?? { countA: 0, countB: 0, comments: [] };
      return {
        ...prev,
        [cardId]: {
          countA: cur.countA + (option === "A" ? 1 : 0),
          countB: cur.countB + (option === "B" ? 1 : 0),
          comments: cur.comments ?? [],
          userSelectedOption: option,
        },
      };
    });
  }, []);

  return (
    <div
      className={`min-h-screen pb-28 ${isTagFilterView ? "bg-[#F1F1F1]" : "bg-white"}`}
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
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>新着順</span>
              <ChevronDownIcon className="h-4 w-4" />
            </div>
            <Checkbox
              checked={showVoted}
              onChange={setShowVoted}
              label="投票済みを表示"
            />
          </div>
          <main className="mx-auto max-w-lg px-[5.333vw] pb-36 pt-6">
            <div className="flex flex-col gap-9">
              {cardsToShow.length === 0 ? (
                <div className="rounded-[2rem] bg-white px-6 py-12 text-center shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
                  <p className="text-sm text-gray-600">
                    {tagFromUrl ? `#${tagFromUrl} の投稿はありません` : "タグを選ぶか検索してください"}
                  </p>
                </div>
              ) : (
                cardsToShow.map((card) => {
                  const index = voteCardsData.indexOf(card);
                  const cardId = `seed-${index}`;
                  const act = activity[cardId];
                  const merged = getMergedCounts(
                    card.countA ?? 0,
                    card.countB ?? 0,
                    card.commentCount ?? 0,
                    act ?? { countA: 0, countB: 0, comments: [] }
                  );
                  return (
                    <VoteCard
                      key={`${card.question}-${index}`}
                      backgroundImageUrl={backgroundPerCard[index]}
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
                      currentUser={demoCurrentUser}
                      cardId={cardId}
                      initialSelectedOption={act?.userSelectedOption ?? null}
                      onVote={handleVote}
                    />
                  );
                })
              )}
              <RecommendedTags tags={recommendedTagList} />
              <CollectionCard
                  title={"マリオのワンダーな\nVOTE"}
                  titleVariant="blackBlock"
                  label="コレクション"
                />
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
              <nav className="flex bg-white" aria-label="検索タブ">
                <button
                  type="button"
                  onClick={() => setActiveTab("trending")}
                  className={`flex flex-1 flex-col pt-[14.4px] pb-[11.4px] text-sm font-bold ${
                    activeTab === "trending" ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  <span className="flex-1" aria-hidden />
                  <span className="relative inline-flex items-center justify-center gap-1">
                    <img src="/icons/icon_chumoku.svg" alt="" className="h-[9px] w-[18px]" width={18} height={9} />
                    注目タグ
                    {activeTab === "trending" && (
                      <span
                        className="absolute -bottom-[11.4px] left-0 right-0 h-[3px] w-full bg-[#FFE100]"
                        aria-hidden
                      />
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("favorite")}
                  className={`flex flex-1 flex-col pt-[14.4px] pb-[11.4px] text-sm font-bold ${
                    activeTab === "favorite" ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  <span className="flex-1" aria-hidden />
                  <span className="relative inline-flex items-center justify-center gap-1">
                    <HeartIcon className="h-4 w-4" />
                    お気に入りタグ
                    {activeTab === "favorite" && (
                      <span
                        className="absolute -bottom-[11.4px] left-0 right-0 h-[3px] w-full bg-[#FFE100]"
                        aria-hidden
                      />
                    )}
                  </span>
                </button>
              </nav>
              {/* 黄バーのすぐ下にグレーライン（余白なし） */}
              <div className="h-px bg-[#E5E7EB]" aria-hidden />
            </>
          )}

          <main className="mx-auto max-w-lg bg-white pb-24">
        {!isSearching ? (
          <>
            {/* 注目タグ（見出しなし・もっと表示すると黄バー間に10px） */}
            {activeTab === "trending" && (
              <section className="border-b border-gray-200 pt-2.5">
                <div className="px-[5.333vw]">
                  {trendingTags.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">検索候補がありません。</p>
                  ) : (
                    <>
                      {trendingTags.slice(0, 8).map((t) => (
                        <TagRow key={t.tag} tag={t.tag} count={t.count} />
                      ))}
                      <div className="mb-[50px] flex justify-center pb-3 pt-3">
                        <button
                          type="button"
                          className="inline-block text-center"
                        >
                          <span className="text-sm font-medium text-gray-600">もっと表示する</span>
                          <span
                            className="mt-2.5 block h-0.5 w-full bg-[#FFE100]"
                            aria-hidden
                          />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {activeTab === "favorite" && (
              <section className="border-b border-gray-200 pt-2.5">
                <div className="px-[5.333vw]">
                  {favoriteTags.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">お気に入りタグはまだありません。</p>
                  ) : (
                    [...favoriteTags]
                      .map((tag) => ({
                        tag,
                        count: trendingTags.find((t) => t.tag === tag)?.count ?? 0,
                      }))
                      .sort((a, b) => b.count - a.count)
                      .map(({ tag, count }) => (
                        <TagRow key={tag} tag={tag} count={count} />
                      ))
                  )}
                </div>
              </section>
            )}

            {/* 人気コレクション（グレーライン・18px左よせ・font-black・上マージン150%） */}
            <section>
              <div className="border-t border-gray-200 px-[5.333vw] pt-6">
                <h2 className="text-left text-[18px] font-black text-gray-900">
                  人気コレクション
                </h2>
              </div>
              <div className="flex flex-col gap-3 px-[5.333vw] pb-2 pt-4">
                {popularCollections.map((col) => (
                  <CollectionCard
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    gradient={col.gradient}
                    showPin={col.showPin}
                    href={`/collection/${col.id}`}
                  />
                ))}
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
                    <TagRow key={t.tag} tag={t.tag} count={t.count} />
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M7 10l5 5 5-5H7z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}
