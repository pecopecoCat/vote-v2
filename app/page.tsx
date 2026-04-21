"use client";

import { useMemo, useState, useEffect, Suspense, useDeferredValue, useCallback } from "react";
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
import ReportViolationModal from "./components/ReportViolationModal";
import type { CurrentUser } from "./components/VoteCard";
import type { FeedTabId } from "./components/FeedTabs";
import type { VoteCardData } from "./data/voteCards";
import { voteCardsData, CARD_BACKGROUND_IMAGES, resolveStableVoteCardId } from "./data/voteCards";
import {
  getMergedCounts,
  isCommentAuthoredByCurrentUser,
  resetAllVoteCounts,
  type CardActivity,
} from "./data/voteCardActivity";
import { useSharedData } from "./context/SharedDataContext";
import { PENDING_VOTE_CREATED_TOAST_KEY, showAppToast } from "./lib/appToast";
import { getCollections, getCollectionsUpdatedEventName, getOtherUsersCollections, resetUser1AndUser2Collections } from "./data/collections";
import { getBookmarkIds, getBookmarksUpdatedEventName, resetUser1AndUser2Bookmarks } from "./data/bookmarks";
import { getAuth, getAuthUpdatedEventName, getCurrentActivityUserId } from "./data/auth";
import {
  getHiddenUserIds,
  addHiddenUser,
  getHiddenUsersUpdatedEventName,
} from "./data/hiddenUsers";
import {
  getHiddenCardIds,
  addHiddenCard,
  getHiddenCardsUpdatedEventName,
} from "./data/hiddenCards";
import { popularCollections, trendingTags, type CollectionGradient } from "./data/search";

/** HOMEタイムライン：注目のタグ（最大10件） */
const homeTagList = trendingTags.map((t) => t.tag).slice(0, 10);

/** 急上昇中：1週間のポイント制（投票+1, コメント+3, ブックマーク+3, 新規作成+5）でポイント多い順 */
const TRENDING_POINTS = { vote: 1, comment: 3, bookmark: 3, newCreation: 5 } as const;
const TRENDING_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getTrendingPoints(
  card: VoteCardData,
  activity: Record<string, CardActivity>
): number {
  const cardId = resolveStableVoteCardId(card);
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
  const pointsMap = new Map<string, number>();
  for (const c of cards) {
    const id = resolveStableVoteCardId(c);
    pointsMap.set(id, getTrendingPoints(c, activity));
  }
  return [...cards].sort((a, b) => {
    const pa = pointsMap.get(resolveStableVoteCardId(a)) ?? 0;
    const pb = pointsMap.get(resolveStableVoteCardId(b)) ?? 0;
    return pb - pa;
  });
}

/** 新着：作成された新しい順に並びます */
function sortByNewest(cards: VoteCardData[]): VoteCardData[] {
  return [...cards].sort((a, b) =>
    (b.createdAt ?? "0").localeCompare(a.createdAt ?? "0")
  );
}

/** myTimeline: 自分の投票・コメントのいずれか新しい方の日時（どちらも無ければカード作成日） */
function myTimelineLastActivityMs(
  card: VoteCardData,
  activity: Record<string, CardActivity>,
  opts: { isLoggedIn: boolean; displayName?: string }
): number {
  const cardId = resolveStableVoteCardId(card);
  const act = activity[cardId];
  let max = 0;
  if (act?.userVotedAt) {
    const t = new Date(act.userVotedAt).getTime();
    if (!Number.isNaN(t)) max = Math.max(max, t);
  }
  if (act?.comments?.length) {
    for (const c of act.comments) {
      if (!isCommentAuthoredByCurrentUser(c.user?.name, opts)) continue;
      const t = new Date(c.date ?? 0).getTime();
      if (!Number.isNaN(t)) max = Math.max(max, t);
    }
  }
  if (max > 0) return max;
  const created = new Date(card.createdAt ?? 0).getTime();
  return Number.isNaN(created) ? 0 : created;
}

/** IDから安定した背景画像を選ぶ（同じカードは常に同じ背景） */
function backgroundForCard(card: VoteCardData): string {
  if (card.backgroundImageUrl) return card.backgroundImageUrl;
  let h = 0;
  const id = resolveStableVoteCardId(card);
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

/** 実際にあるコレクションのプール（人気＋他ユーザー＋自分のコレクション）。ランダム表示用 */
function getTimelineCollectionPool(
  collections: { id: string; name: string; gradient?: CollectionGradient; visibility?: string }[]
): { id: string; title: string; gradient: CollectionGradient }[] {
  const other = getOtherUsersCollections().map((c) => ({
    id: c.id,
    title: c.name,
    gradient: (c.gradient ?? "orange-yellow") as CollectionGradient,
  }));
  const mine = collections
    .filter((c) => c.visibility !== "member")
    .map((c) => ({
      id: c.id,
      title: c.name,
      gradient: (c.gradient ?? "orange-yellow") as CollectionGradient,
    }));
  return [...popularCollections, ...other, ...mine];
}

/** タイムライン配列を組み立て（5/10/15ルール・コレクションは位置で安定選択） */
function buildTimelineItems(
  cards: VoteCardData[],
  collectionPool: { id: string; title: string; gradient: CollectionGradient }[]
): TimelineItem[] {
  const items: TimelineItem[] = [];
  let prBannerIndex = 0;
  for (let i = 0; i < cards.length; i++) {
    const oneBased = i + 1;
    if (oneBased % COLLECTION_EVERY === 0 && collectionPool.length > 0) {
      const colIndex = Math.floor(oneBased / COLLECTION_EVERY) % collectionPool.length;
      const col = collectionPool[colIndex];
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

  /** VOTE作成完了後、HOME の新着タブ表示時に一度だけトースト */
  useEffect(() => {
    if (activeTab !== "new") return;
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(PENDING_VOTE_CREATED_TOAST_KEY) !== "1") return;
      sessionStorage.removeItem(PENDING_VOTE_CREATED_TOAST_KEY);
    } catch {
      return;
    }
    showAppToast("VOTEを作成しました");
  }, [activeTab]);
  const [collections, setCollections] = useState(() => getCollections());
  const shared = useSharedData();
  const { createdVotesForTimeline, activity, addVote: sharedAddVote } = shared;
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [cardOptionsCardId, setCardOptionsCardId] = useState<string | null>(null);
  const [cardOptionsIsOwnCard, setCardOptionsIsOwnCard] = useState(false);
  const [reportCardId, setReportCardId] = useState<string | null>(null);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>(() => getHiddenUserIds());
  const [hiddenCardIds, setHiddenCardIds] = useState<string[]>(() => getHiddenCardIds());
  const [auth, setAuth] = useState(() => getAuth());

  useEffect(() => {
    const handler = () => setHiddenUserIds(getHiddenUserIds());
    window.addEventListener(getHiddenUsersUpdatedEventName(), handler);
    return () => window.removeEventListener(getHiddenUsersUpdatedEventName(), handler);
  }, []);
  useEffect(() => {
    const handler = () => setHiddenCardIds(getHiddenCardIds());
    window.addEventListener(getHiddenCardsUpdatedEventName(), handler);
    return () => window.removeEventListener(getHiddenCardsUpdatedEventName(), handler);
  }, []);

  useEffect(() => {
    ensureVoteCountsResetOnce();
    ensureUser1User2CollectionsResetOnce();
  }, []);

  useEffect(() => {
    const handler = () => setAuth(getAuth());
    window.addEventListener(getAuthUpdatedEventName(), handler);
    return () => window.removeEventListener(getAuthUpdatedEventName(), handler);
  }, []);

  const currentUser = useMemo<CurrentUser>(
    () =>
      auth.isLoggedIn && auth.user
        ? { type: "sns", name: auth.user.name, iconUrl: auth.user.iconUrl }
        : { type: "guest" },
    [auth.isLoggedIn, auth.user]
  );

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

  const allCards = useMemo(() => {
    const seedWithId = voteCardsData.map((c, i) => ({ ...c, id: `seed-${i}` }));
    return [...createdVotesForTimeline, ...seedWithId];
  }, [createdVotesForTimeline]);

  /** 非表示にしたユーザー・カードを除外 */
  const allCardsFiltered = useMemo(
    () =>
      allCards.filter((c) => {
        const cardId = resolveStableVoteCardId(c);
        if (hiddenCardIds.includes(cardId)) return false;
        if (c.createdByUserId && hiddenUserIds.includes(c.createdByUserId)) return false;
        return true;
      }),
    [allCards, hiddenUserIds, hiddenCardIds]
  );

  const commentedCardIdSet = useMemo(() => {
    const set = new Set<string>();
    const opts = {
      isLoggedIn: auth.isLoggedIn,
      displayName: auth.user?.name,
    };
    for (const card of allCardsFiltered) {
      const id = resolveStableVoteCardId(card);
      const a = activity[id];
      if ((a?.comments ?? []).some((c) => isCommentAuthoredByCurrentUser(c.user?.name, opts))) {
        set.add(id);
      }
    }
    return set;
  }, [allCardsFiltered, activity, auth.isLoggedIn, auth.user?.name]);

  const handleCardMoreClick = useCallback((cardId: string) => {
    setCardOptionsCardId(cardId);
    const card = allCardsFiltered.find((c) => resolveStableVoteCardId(c) === cardId);
    setCardOptionsIsOwnCard(card?.createdByUserId === getCurrentActivityUserId());
  }, [allCardsFiltered]);

  /** 公開カードのみ（private はリンクを知ってる人だけ＝一覧には出さない） */
  const publicCards = useMemo(
    () => allCardsFiltered.filter((c) => c.visibility !== "private"),
    [allCardsFiltered]
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

  /**
   * 急上昇・新着：activity の userSelectedOption で投票済みを除外（キーずれを防ぐ）。
   * 投票したカード ID をここに入れてタブ切替・visibility まで一覧に残す（結果表示のまま）。
   */
  const [feedKeepVotedCardVisibleIds, setFeedKeepVotedCardVisibleIds] = useState<Set<string>>(
    () => new Set()
  );

  const handleVote = useCallback(
    (id: string, option: "A" | "B") => {
      setFeedKeepVotedCardVisibleIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      void sharedAddVote(id, option);
    },
    [sharedAddVote]
  );

  useEffect(() => {
    setFeedKeepVotedCardVisibleIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        setFeedKeepVotedCardVisibleIds(new Set());
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  /** 急上昇・新着：投票済みは除外。myTimeline は cardsForTab 側で全件 */
  const cardsForFeed = useMemo(
    () =>
      publicCards.filter((c) => {
        const id = resolveStableVoteCardId(c);
        const voted = activity[id]?.userSelectedOption != null;
        if (!voted) return true;
        return feedKeepVotedCardVisibleIds.has(id);
      }),
    [publicCards, activity, feedKeepVotedCardVisibleIds]
  );

  const cardsForTab = useMemo(() => {
    switch (activeTab) {
      case "trending":
        return sortByTrending(cardsForFeed, activity);
      case "new":
        return sortByNewest(cardsForFeed);
      case "myTimeline": {
        const opts = { isLoggedIn: auth.isLoggedIn, displayName: auth.user?.name };
        return allCardsFiltered
          .filter((card) => bookmarkedIds.has(resolveStableVoteCardId(card)))
          .sort((a, b) => {
            const tb = myTimelineLastActivityMs(b, activity, opts);
            const ta = myTimelineLastActivityMs(a, activity, opts);
            if (tb !== ta) return tb - ta;
            return (b.createdAt ?? "0").localeCompare(a.createdAt ?? "0");
          });
      }
      default:
        return publicCards;
    }
  }, [activeTab, bookmarkedIds, allCardsFiltered, cardsForFeed, activity, auth.isLoggedIn, auth.user?.name]);

  /** 実際にあるコレクションからランダム表示用プール */
  const timelineCollectionPool = useMemo(() => getTimelineCollectionPool(collections), [collections]);

  /** タイムライン（VOTE＋5個に1つコレクション、10個につきタグ、15個につきPR） */
  const timelineItems = useMemo(
    () => buildTimelineItems(cardsForTab, timelineCollectionPool),
    [cardsForTab, timelineCollectionPool]
  );
  const deferredTimelineItems = useDeferredValue(timelineItems);

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
        <div className="flex flex-col gap-[5.333vw]">
          {activeTab === "myTimeline" && cardsForTab.length === 0 ? (
            <div className="rounded-[2rem] bg-white px-6 py-12 text-center shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
              <p className="text-sm text-gray-600">
                ブックマークした投稿がここに表示されます。
              </p>
            </div>
          ) : (activeTab === "trending" || activeTab === "new") && cardsForTab.length === 0 ? (
            <div className="rounded-[2rem] bg-white px-6 py-12 text-center shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
              <p className="text-sm text-gray-600">
                まだ投票できる投稿がありません。
              </p>
            </div>
          ) : null}

          {deferredTimelineItems.map((item, idx) => {
            if (item.type === "vote") {
              const card = item.card;
              const cardId = resolveStableVoteCardId(card);
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
                  hasCommented={commentedCardIdSet.has(cardId)}
                  initialSelectedOption={act?.userSelectedOption ?? null}
                  onVote={handleVote}
                  onBookmarkClick={setModalCardId}
                  onMoreClick={handleCardMoreClick}
                  visibility={card.visibility}
                  optionAImageUrl={card.optionAImageUrl}
                  optionBImageUrl={card.optionBImageUrl}
                  periodStart={card.periodStart}
                  periodEnd={card.periodEnd}
                  commentsDisabled={card.commentsDisabled === true}
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
                  href={`/collection/${id}`}
                  timelineBanner
                />
              );
            }
            if (item.type === "tags") {
              return <RecommendedTags key={`tags-${idx}`} tags={homeTagList} />;
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
          isOwnCard={cardOptionsIsOwnCard}
          onClose={() => setCardOptionsCardId(null)}
          onHide={(cardId) => {
            const card = allCards.find(
              (c) => (c.id ?? c.question) === cardId
            );
            if (card?.createdByUserId) addHiddenUser(card.createdByUserId);
            addHiddenCard(cardId);
            setHiddenUserIds(getHiddenUserIds());
            setHiddenCardIds(getHiddenCardIds());
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
    </div>
  );
}

function HomeFallback() {
  return (
    <div className="min-h-screen bg-[#F1F1F1]">
      <AppHeader type="logo" />
      <main className="mx-auto max-w-lg px-[5.333vw] pb-[50px] pt-4">
        <div className="flex flex-col gap-[5.333vw] animate-pulse">
          <div className="h-10 w-32 rounded-full bg-gray-200" aria-hidden />
          <div className="flex flex-col gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[200px] rounded-[18px] bg-gray-200" aria-hidden />
            ))}
          </div>
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
