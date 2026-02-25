"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "./components/AppHeader";
import VoteCard from "./components/VoteCard";
import AdCard from "./components/AdCard";
import RecommendedTags from "./components/RecommendedTags";
import CollectionCard from "./components/CollectionCard";
import BottomNav from "./components/BottomNav";
import FeedTabs from "./components/FeedTabs";
import BookmarkCollectionModal from "./components/BookmarkCollectionModal";
import CardOptionsModal from "./components/CardOptionsModal";
import type { CurrentUser } from "./components/VoteCard";
import type { FeedTabId } from "./components/FeedTabs";
import type { VoteCardData } from "./data/voteCards";
import {
  voteCardsData,
  CARD_BACKGROUND_IMAGES,
  recommendedTagList,
} from "./data/voteCards";
import { getCreatedVotesForTimeline } from "./data/createdVotes";
import {
  getAllActivity,
  addVote as persistVote,
  getMergedCounts,
  getCardIdsUserCommentedOn,
  resetAllVoteCounts,
  type CardActivity,
} from "./data/voteCardActivity";
import { getCollections, getCollectionsUpdatedEventName, resetUser1AndUser2Collections } from "./data/collections";
import { getBookmarkIds, getBookmarksUpdatedEventName, resetUser1AndUser2Bookmarks } from "./data/bookmarks";
import { getAuth, getAuthUpdatedEventName } from "./data/auth";
import { popularCollections, type CollectionGradient } from "./data/search";

/** 急上昇中：1週間のポイント制（投票+1, コメント+3, ブックマーク+3, 新規作成+5）でポイント多い順 */
const TRENDING_POINTS = { vote: 1, comment: 3, bookmark: 3, newCreation: 5 } as const;
const TRENDING_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getTrendingPoints(
  card: VoteCardData,
  activity: Record<string, CardActivity>
): number {
  const cardId = card.id ?? card.question;
  const act = activity[cardId] ?? { countA: 0, countB: 0, comments: [] };
  const merged = getMergedCounts(card.countA, card.countB, card.commentCount, act);
  const votes = merged.countA + merged.countB;
  const comments = merged.commentCount;
  const bookmarks = card.bookmarkCount ?? 0;
  const createdMs = new Date(card.createdAt ?? 0).getTime();
  const isNewInLastWeek = createdMs >= Date.now() - TRENDING_WEEK_MS;
  return (
    votes * TRENDING_POINTS.vote +
    comments * TRENDING_POINTS.comment +
    bookmarks * TRENDING_POINTS.bookmark +
    (isNewInLastWeek ? TRENDING_POINTS.newCreation : 0)
  );
}

function sortByTrending(
  cards: VoteCardData[],
  activity: Record<string, CardActivity>
): VoteCardData[] {
  return [...cards].sort((a, b) => {
    const pointsA = getTrendingPoints(a, activity);
    const pointsB = getTrendingPoints(b, activity);
    return pointsB - pointsA;
  });
}

/** 新着：作成された新しい順に並びます */
function sortByNewest(cards: VoteCardData[]): VoteCardData[] {
  return [...cards].sort((a, b) =>
    (b.createdAt ?? "0").localeCompare(a.createdAt ?? "0")
  );
}

/** IDから安定した背景画像を選ぶ（同じカードは常に同じ背景） */
function backgroundForCard(card: VoteCardData): string {
  if (card.backgroundImageUrl) return card.backgroundImageUrl;
  let h = 0;
  const id = card.id ?? card.question;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % CARD_BACKGROUND_IMAGES.length;
  return CARD_BACKGROUND_IMAGES[idx];
}

/** タイムライン差し込みルール：5個に1つコレクション、10個につき1setおすすめタグ、15個につき1つPR */
const COLLECTION_EVERY = 5;
const TAGS_EVERY = 10;
const PR_BANNER_EVERY = 15;

/** PRバナー（何種類か登録可能・15個に1つでローテーション） */
const PR_BANNERS: { brandName: string; caption: string; imageUrl?: string }[] = [
  { brandName: "Oisix", caption: "入会のご案内", imageUrl: "/banners/oisix-banner.png" },
  { brandName: "PR", caption: "おすすめ" },
];

export type TimelineItem =
  | { type: "vote"; card: VoteCardData }
  | { type: "collection"; collection: { id: string; title: string; gradient: CollectionGradient } }
  | { type: "tags" }
  | { type: "pr"; banner: (typeof PR_BANNERS)[number] };

/** タイムライン配列を組み立て（5/10/15ルール・コレクションはランダム） */
function buildTimelineItems(cards: VoteCardData[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  let prBannerIndex = 0;
  for (let i = 0; i < cards.length; i++) {
    const oneBased = i + 1;
    if (oneBased % COLLECTION_EVERY === 0) {
      const pool = popularCollections.length > 0 ? popularCollections : [{ id: "d", title: "マリオのワンダーな\nVOTE", gradient: "orange-yellow" as CollectionGradient }];
      const idx = Math.floor(Math.random() * pool.length);
      const col = pool[idx];
      items.push({
        type: "collection",
        collection: { id: col.id, title: col.title, gradient: col.gradient },
      });
    }
    if (oneBased % TAGS_EVERY === 0) {
      items.push({ type: "tags" });
    }
    if (oneBased % PR_BANNER_EVERY === 0) {
      items.push({ type: "pr", banner: PR_BANNERS[prBannerIndex % PR_BANNERS.length] });
      prBannerIndex += 1;
    }
    items.push({ type: "vote", card: cards[i] });
  }
  return items;
}

const RESET_VOTE_COUNTS_FLAG = "vote_counts_reset_v1";
/** 一度だけ user1/user2 のコレクション・ブックマークを空にする。以降は登録を保持（二度とリセットしない） */
const RESET_COLLECTIONS_FLAG = "vote_collections_reset_v3";

function ensureVoteCountsResetOnce(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(RESET_VOTE_COUNTS_FLAG)) return;
  resetAllVoteCounts();
  window.localStorage.setItem(RESET_VOTE_COUNTS_FLAG, "1");
}

function ensureUser1User2CollectionsResetOnce(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(RESET_COLLECTIONS_FLAG)) return;
  resetUser1AndUser2Collections();
  resetUser1AndUser2Bookmarks();
  window.localStorage.setItem(RESET_COLLECTIONS_FLAG, "1");
}

function HomeContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<FeedTabId>(() =>
    tabFromUrl === "new" ? "new" : tabFromUrl === "myTimeline" ? "myTimeline" : "trending"
  );
  useEffect(() => {
    if (tabFromUrl === "new") setActiveTab("new");
    else if (tabFromUrl === "myTimeline") setActiveTab("myTimeline");
  }, [tabFromUrl]);
  const [collections, setCollections] = useState(() => getCollections());
  const [activity, setActivity] = useState<Record<string, CardActivity>>(() => {
    ensureVoteCountsResetOnce();
    ensureUser1User2CollectionsResetOnce();
    return getAllActivity();
  });
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [cardOptionsCardId, setCardOptionsCardId] = useState<string | null>(null);
  const [auth, setAuth] = useState(() => getAuth());

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

  const currentUser: CurrentUser = auth.isLoggedIn && auth.user
    ? { type: "sns", name: auth.user.name, iconUrl: auth.user.iconUrl }
    : { type: "guest" };

  /** 未ログイン時は myTimeline タブを出さないので、選択中なら急上昇中に切り替え */
  useEffect(() => {
    if (currentUser.type !== "sns" && activeTab === "myTimeline") {
      setActiveTab("trending");
    }
  }, [currentUser.type, activeTab]);

  useEffect(() => {
    const eventName = getCollectionsUpdatedEventName();
    const handler = () => setCollections(getCollections());
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  const commentedCardIds = useMemo(() => getCardIdsUserCommentedOn(), [activity]);

  const allCards = useMemo(() => {
    const created = getCreatedVotesForTimeline();
    const seedWithId = voteCardsData.map((c, i) => ({ ...c, id: `seed-${i}` }));
    return [...created, ...seedWithId];
  }, []);

  /** 公開カードのみ（private はリンクを知ってる人だけ＝一覧には出さない） */
  const publicCards = useMemo(
    () => allCards.filter((c) => c.visibility !== "private"),
    [allCards]
  );

  const [bookmarkRefreshKey, setBookmarkRefreshKey] = useState(0);
  useEffect(() => {
    const handler = () => setBookmarkRefreshKey((k) => k + 1);
    window.addEventListener(getBookmarksUpdatedEventName(), handler);
    return () => window.removeEventListener(getBookmarksUpdatedEventName(), handler);
  }, []);
  const bookmarkedIds = useMemo(
    () => new Set(getBookmarkIds()),
    [collections, bookmarkRefreshKey, auth]
  );

  /** ページ表示時点で投票済みのID（リロード・再訪問時のみ更新。投票直後は更新しない） */
  const [votedIdsAtLoad] = useState(() => {
    if (typeof window === "undefined") return new Set<string>();
    const act = getAllActivity();
    return new Set(
      Object.entries(act)
        .filter(([, a]) => a?.userSelectedOption)
        .map(([id]) => id)
    );
  });

  /** 急上昇中・新着では投票済みカードを除外（votedIdsAtLoad のためリロード/再訪問時のみ反映） */
  const cardsForFeed = useMemo(
    () => publicCards.filter((c) => !votedIdsAtLoad.has(c.id ?? "")),
    [publicCards, votedIdsAtLoad]
  );

  const cardsForTab = useMemo(() => {
    switch (activeTab) {
      case "trending":
        return sortByTrending(cardsForFeed, activity);
      case "new":
        return sortByNewest(cardsForFeed);
      case "myTimeline": {
        return allCards
          .filter((card) => bookmarkedIds.has(card.id ?? ""))
          .sort((a, b) =>
            (b.createdAt ?? "0").localeCompare(a.createdAt ?? "0")
          );
      }
      default:
        return publicCards;
    }
  }, [activeTab, bookmarkedIds, allCards, cardsForFeed, activity]);

  /** タイムライン（VOTE＋5個に1つコレクション、10個につきタグ、15個につきPR） */
  const timelineItems = useMemo(() => buildTimelineItems(cardsForTab), [cardsForTab]);

  return (
    <div className="min-h-screen bg-[#F1F1F1]">
      <AppHeader type="logo" />

      {/* タブ：急上昇中 / 新着 / myTimeline */}
      <FeedTabs
        activeId={activeTab}
        onSelect={setActiveTab}
        isLoggedIn={currentUser.type === "sns"}
      />

      {/* メインコンテンツ（下ナビ分の余白を確保） */}
      <main className="mx-auto max-w-lg px-[5.333vw] pb-[50px] pt-4">
        <div className="flex flex-col gap-[60px]">
          {activeTab === "myTimeline" && cardsForTab.length === 0 ? (
            <div className="rounded-[2rem] bg-white px-6 py-12 text-center shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
              <p className="text-sm text-gray-600">
                ブックマークした投稿がここに表示されます。
              </p>
            </div>
          ) : null}

          {timelineItems.map((item, idx) => {
            if (item.type === "vote") {
              const card = item.card;
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
                  key={`vote-${cardId}`}
                  backgroundImageUrl={backgroundForCard(card)}
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
                  bookmarked={bookmarkedIds.has(cardId)}
                  hasCommented={commentedCardIds.includes(cardId)}
                  initialSelectedOption={act?.userSelectedOption ?? null}
                  onVote={(id, option) => {
                    persistVote(id, option);
                    setActivity((prev) => {
                      const cur = prev[id] ?? { countA: 0, countB: 0, comments: [] };
                      return {
                        ...prev,
                        [id]: {
                          countA: cur.countA + (option === "A" ? 1 : 0),
                          countB: cur.countB + (option === "B" ? 1 : 0),
                          comments: cur.comments ?? [],
                          userSelectedOption: option,
                        },
                      };
                    });
                  }}
                  onBookmarkClick={setModalCardId}
                  onMoreClick={setCardOptionsCardId}
                  visibility={card.visibility}
                  optionAImageUrl={card.optionAImageUrl}
                  optionBImageUrl={card.optionBImageUrl}
                />
              );
            }
            if (item.type === "collection") {
              const { id, title, gradient } = item.collection;
              return (
                <CollectionCard
                  key={`col-${id}-${idx}`}
                  id={id}
                  title={title}
                  gradient={gradient}
                  titleVariant="blackBlock"
                  label="コレクション"
                  href={`/collection/${id}`}
                  timelineBanner
                />
              );
            }
            if (item.type === "tags") {
              return <RecommendedTags key={`tags-${idx}`} tags={recommendedTagList} />;
            }
            if (item.type === "pr") {
              return (
                <AdCard
                  key={`pr-${idx}`}
                  brandName={item.banner.brandName}
                  caption={item.banner.caption}
                  imageUrl={item.banner.imageUrl}
                />
              );
            }
            return null;
          })}
        </div>
      </main>

      {/* 下部ナビ（スマホメイン） */}
      <BottomNav activeId="home" />

      {modalCardId != null && (
        <BookmarkCollectionModal
          cardId={modalCardId}
          onClose={() => setModalCardId(null)}
          isLoggedIn={currentUser.type === "sns"}
          onCollectionsUpdated={() => setCollections(getCollections())}
        />
      )}

      {cardOptionsCardId != null && (
        <CardOptionsModal
          cardId={cardOptionsCardId}
          onClose={() => setCardOptionsCardId(null)}
        />
      )}
    </div>
  );
}

function HomeFallback() {
  return (
    <div className="min-h-screen bg-[#F1F1F1]">
      <AppHeader type="logo" />
      <main className="mx-auto max-w-lg px-[5.333vw] pb-[50px] pt-4">
        <div className="flex justify-center py-12">
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      </main>
      <BottomNav activeId="home" />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}
