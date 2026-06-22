"use client";

import {
  useMemo,
  useState,
  useEffect,
  useLayoutEffect,
  Suspense,
  useCallback,
  useRef,
  memo,
} from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import AppHeader from "./components/AppHeader";
import VoteCard, { type CurrentUser } from "./components/VoteCard";
import { VoteCardList } from "./components/VoteCardList";
import AdCard from "./components/AdCard";
import RecommendedTags from "./components/RecommendedTags";
import CollectionCard from "./components/CollectionCard";
import FeedTabs from "./components/FeedTabs";
import BookmarkCollectionModal from "./components/BookmarkCollectionModal";
import type { FeedTabId } from "./components/FeedTabs";
import type { VoteCardData } from "./data/voteCards";
import {
  voteCardsData,
  resolveStableVoteCardId,
  recommendedTagList,
} from "./data/voteCards";
import {
  getMergedCounts,
  isCommentAuthoredByCurrentUser,
  resetAllVoteCounts,
  type CardActivity,
} from "./data/voteCardActivity";
import { useSharedData } from "./context/SharedDataContext";
import { useEnsureCollectionsHydrated } from "./hooks/useEnsureCollectionsHydrated";
import { useSearchCollectionsWarm } from "./hooks/useSearchCollectionsWarm";
import { sortCollectionsByPinned } from "./lib/sortCollectionsByPinned";
import { PENDING_VOTE_CREATED_TOAST_KEY, showAppToast } from "./lib/appToast";
import { buildVoteCardProps } from "./lib/buildVoteCardProps";
import { resolveCardBackgroundUrl } from "./lib/resolveCardBackgroundUrl";
import { useAuthState } from "./hooks/useAuthState";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { useCardModerationFlow } from "./hooks/useCardModerationFlow";
import CardModerationModals from "./components/CardModerationModals";
import { getCollections, getCollectionsUpdatedEventName, getOtherUsersCollections, getPinnedCollectionIds, isCollectionPinnable, PINNED_UPDATED_EVENT, resetUser1AndUser2Collections } from "./data/collections";
import { getBookmarkIds, getBookmarksUpdatedEventName, resetUser1AndUser2Bookmarks } from "./data/bookmarks";
import { getCurrentActivityUserId } from "./data/auth";
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
import { popularCollections, getTrendingTagsFromCards, type CollectionGradient } from "./data/search";

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


/** タイムライン差し込みルール：5個に1つコレクション、10個につき1setおすすめタグ、15個につき1つPR */
const COLLECTION_EVERY = 5;
const TAGS_EVERY = 10;
const PR_BANNER_EVERY = 15;

/** PRバナー（何種類か登録可能・15個に1つで順番ローテーション） */
const PR_BANNERS: {
  brandName: string;
  caption: string;
  imageUrl?: string;
  fallbackGradientClassName?: string;
}[] = [
  {
    brandName: "Oisix",
    caption: "入会のご案内",
    imageUrl: "/banners/oisix-banner.png",
  },
  {
    brandName: "TRAVEL SNAP",
    caption: "週末旅プラン｜読者アンケート募集中",
    fallbackGradientClassName:
      "bg-gradient-to-br from-sky-500/95 via-blue-600/90 to-indigo-800/95",
  },
  {
    brandName: "MINI MART",
    caption: "新商品お試し｜店舗限定クーポン（デモ）",
    fallbackGradientClassName:
      "bg-gradient-to-br from-amber-400/95 via-orange-500/90 to-rose-600/90",
  },
  {
    brandName: "FIT LOOP",
    caption: "毎日5分｜姿勢ケアアプリ特集",
    fallbackGradientClassName:
      "bg-gradient-to-br from-emerald-500/95 via-teal-600/90 to-cyan-800/95",
  },
  {
    brandName: "AUDIO LAB",
    caption: "ノイキャン比較｜人気3モデルまとめ",
    fallbackGradientClassName:
      "bg-gradient-to-br from-violet-600/95 via-purple-700/90 to-fuchsia-900/95",
  },
  {
    brandName: "HOME BOX",
    caption: "収納アイデア｜before/after 特集",
    fallbackGradientClassName:
      "bg-gradient-to-br from-stone-500/95 via-neutral-600/90 to-zinc-900/95",
  },
  {
    brandName: "SWEET NOTE",
    caption: "季節スイーツ｜都内カフェ10選",
    fallbackGradientClassName:
      "bg-gradient-to-br from-pink-400/95 via-rose-500/90 to-red-700/90",
  },
  {
    brandName: "LOCAL NEWS+",
    caption: "地域トピック｜ライター募集（デモ）",
    fallbackGradientClassName:
      "bg-gradient-to-br from-slate-600/95 via-slate-800/90 to-slate-950/95",
  },
  {
    brandName: "PR",
    caption: "おすすめコンテンツ",
    fallbackGradientClassName:
      "bg-gradient-to-br from-red-400/90 via-red-500/80 to-green-600/90",
  },
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

/** 初回マウント負荷を抑え、近づいたら追加（長いタイムライン向け） */
const TIMELINE_INITIAL_VISIBLE = 12;
const TIMELINE_LOAD_MORE = 10;

/** コミュニティ一覧用グラデーションのローテーション */
const COMMUNITY_GRADIENTS: CollectionGradient[] = [
  "blue-cyan",
  "pink-purple",
  "purple-pink",
  "orange-yellow",
  "green-yellow",
  "cyan-aqua",
];

const COMMUNITY_INITIAL_VISIBLE = 8;
const COMMUNITY_LOAD_MORE = 8;

/** HOME の Suspense / KV ブートストラップ待ちで共通（文言は1種類のみ） */
function HomeLoadingMessage() {
  return (
    <p className="rounded-2xl bg-white/90 px-4 py-3 text-center text-sm leading-relaxed text-[#191919] shadow-[0_2px_1px_0_rgba(51,51,51,0.08)]">
      読み込み中…
    </p>
  );
}

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

const HomeTimelineFeed = memo(function HomeTimelineFeed({
  timelineItems,
  timelineTagList,
  activity,
  commentedCardIdSet,
  bookmarkedIds,
  currentUser,
  handleVote,
  onBookmarkClick,
  onMoreClick,
}: {
  timelineItems: TimelineItem[];
  timelineTagList: string[];
  activity: Record<string, CardActivity>;
  commentedCardIdSet: Set<string>;
  bookmarkedIds: Set<string>;
  currentUser: CurrentUser;
  handleVote: (id: string, option: "A" | "B") => void;
  onBookmarkClick: (cardId: string) => void;
  onMoreClick: (cardId: string) => void;
}) {
  const [loadMoreSteps, setLoadMoreSteps] = useState(0);
  const visibleCount = Math.min(
    TIMELINE_INITIAL_VISIBLE + loadMoreSteps * TIMELINE_LOAD_MORE,
    timelineItems.length
  );
  const visibleTimelineItems = useMemo(
    () => timelineItems.slice(0, visibleCount),
    [timelineItems, visibleCount]
  );
  const loadSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = loadSentinelRef.current;
    if (!root || visibleCount >= timelineItems.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoadMoreSteps((s) => s + 1);
        }
      },
      { root: null, rootMargin: "240px 0px", threshold: 0 }
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, [visibleCount, timelineItems.length]);

  return (
    <>
      {visibleTimelineItems.map((item, idx) => {
        if (item.type === "vote") {
          const card = item.card;
          const cardId = resolveStableVoteCardId(card);
          const act = activity[cardId];
          return (
              <VoteCard
                key={`vote-${cardId}`}
                {...buildVoteCardProps({
                  card,
                  cardId,
                  activity: act,
                  currentUser,
                  surface: "participate",
                  backgroundImageUrl: resolveCardBackgroundUrl(card),
                  bookmarked: bookmarkedIds.has(cardId),
                  hasCommented: commentedCardIdSet.has(cardId),
                  onVote: handleVote,
                  onBookmarkClick,
                  onMoreClick,
                })}
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
              label="コレクション"
            />
          );
        }
        if (item.type === "tags") {
          return <RecommendedTags key={`tags-${idx}`} tags={timelineTagList} />;
        }
        if (item.type === "pr") {
          return (
            <AdCard
              key={`pr-${idx}`}
              brandName={item.banner.brandName}
              caption={item.banner.caption}
              imageUrl={item.banner.imageUrl}
              fallbackGradientClassName={item.banner.fallbackGradientClassName}
            />
          );
        }
        return null;
      })}
      {visibleCount < timelineItems.length ? (
        <div ref={loadSentinelRef} className="h-1 w-full shrink-0" aria-hidden />
      ) : null}
    </>
  );
});

function HomeContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<FeedTabId>(() =>
    tabFromUrl === "new" ? "new" : tabFromUrl === "community" ? "community" : "trending"
  );

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
  const [pinnedCollectionIds, setPinnedCollectionIds] = useState(() => getPinnedCollectionIds());
  const [communityVisibleCount, setCommunityVisibleCount] = useState(COMMUNITY_INITIAL_VISIBLE);
  const communityLoadSentinelRef = useRef<HTMLDivElement | null>(null);
  const shared = useSharedData();
  const { createdVotesForTimeline, activity, activityBootstrapDone, addVote: sharedAddVote } = shared;
  useEnsureCollectionsHydrated();
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const moderation = useCardModerationFlow();
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>(() => getHiddenUserIds());
  const [hiddenCardIds, setHiddenCardIds] = useState<string[]>(() => getHiddenCardIds());
  const hiddenCardIdSet = useMemo(() => new Set(hiddenCardIds), [hiddenCardIds]);
  const hiddenUserIdSet = useMemo(() => new Set(hiddenUserIds), [hiddenUserIds]);
  const auth = useAuthState();
  const isLoggedIn = auth.isLoggedIn;

  const refreshCollections = useCallback(() => {
    setCollections(getCollections());
    setPinnedCollectionIds(getPinnedCollectionIds());
  }, []);

  const collectionsWarmTab = activeTab === "community" ? "community" : "trending";
  const { remotePopularCollections, collectionsIndexLoading } = useSearchCollectionsWarm(
    isLoggedIn,
    collectionsWarmTab,
    refreshCollections
  );

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

  const currentUser = useCurrentUser(auth);

  const searchParamsKey = searchParams.toString();

  /** ブラウザの戻る／進む・URL直打ちでタブをURLと一致させる */
  useEffect(() => {
    if (tabFromUrl === "new") {
      setActiveTab("new");
      return;
    }
    if (tabFromUrl === "community") {
      setActiveTab("community");
      return;
    }
    setActiveTab("trending");
  }, [tabFromUrl]);

  /** 廃止した ?tab=myTimeline を急上昇中へ戻す */
  useEffect(() => {
    if (tabFromUrl !== "myTimeline") return;
    const params = new URLSearchParams(searchParamsKey);
    params.delete("tab");
    const qs = params.toString();
    void router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setActiveTab("trending");
  }, [tabFromUrl, pathname, router, searchParamsKey]);

  const selectFeedTab = useCallback(
    (id: FeedTabId) => {
      setActiveTab(id);
      const params = new URLSearchParams(searchParamsKey);
      if (id === "trending") {
        params.delete("tab");
      } else {
        params.set("tab", id);
      }
      const qs = params.toString();
      void router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParamsKey]
  );

  useEffect(() => {
    const eventName = getCollectionsUpdatedEventName();
    const handler = () => refreshCollections();
    window.addEventListener(eventName, handler);
    window.addEventListener(PINNED_UPDATED_EVENT, handler);
    return () => {
      window.removeEventListener(eventName, handler);
      window.removeEventListener(PINNED_UPDATED_EVENT, handler);
    };
  }, [refreshCollections]);

  useEffect(() => {
    if (activeTab !== "community") {
      setCommunityVisibleCount(COMMUNITY_INITIAL_VISIBLE);
    }
  }, [activeTab]);

  const allCards = useMemo(() => {
    const seedWithId = voteCardsData.map((c, i) => ({ ...c, id: `seed-${i}` }));
    return [...createdVotesForTimeline, ...seedWithId];
  }, [createdVotesForTimeline]);

  /** 非表示にしたユーザー・カードを除外 */
  const allCardsFiltered = useMemo(
    () =>
      allCards.filter((c) => {
        const cardId = resolveStableVoteCardId(c);
        if (hiddenCardIdSet.has(cardId)) return false;
        if (c.createdByUserId && hiddenUserIdSet.has(c.createdByUserId)) return false;
        return true;
      }),
    [allCards, hiddenUserIdSet, hiddenCardIdSet]
  );

  /** activity 側だけ走査（カード全件×コメントより軽い） */
  const commentedCardIdSet = useMemo(() => {
    const set = new Set<string>();
    const opts = {
      isLoggedIn: auth.isLoggedIn,
      displayName: auth.user?.name,
    };
    for (const [cardId, a] of Object.entries(activity)) {
      if ((a?.comments ?? []).some((c) => isCommentAuthoredByCurrentUser(c.user?.name, opts))) {
        set.add(cardId);
      }
    }
    return set;
  }, [activity, auth.isLoggedIn, auth.user?.name]);

  const handleCardMoreClick = useCallback(
    (cardId: string) => {
      const card = allCardsFiltered.find((c) => resolveStableVoteCardId(c) === cardId);
      moderation.openCardOptions(cardId, card?.createdByUserId === getCurrentActivityUserId());
    },
    [allCardsFiltered, moderation]
  );

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
   * 急上昇・新着：投票済みは通常除外。投票直後だけ ID を入れて結果表示のまま残す。
   * リロード相当は「HOME 内タブ切替」「HOME 以外へページ遷移」のときのみ。
   */
  const [feedKeepVotedCardVisibleIds, setFeedKeepVotedCardVisibleIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    setFeedKeepVotedCardVisibleIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    if (pathname !== "/") {
      setFeedKeepVotedCardVisibleIds(new Set());
    }
  }, [pathname]);

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

  /** 急上昇・新着：投票済みは除外 */
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

  /** 急上昇中：並びはタブ復帰・別ページから戻る・ブラウザタブ復帰・リロード時だけ更新（投票のたびにガクッと動かない） */
  const cardsForFeedRef = useRef(cardsForFeed);
  const activityRef = useRef(activity);
  cardsForFeedRef.current = cardsForFeed;
  activityRef.current = activity;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const [trendingOrderTick, setTrendingOrderTick] = useState(0);
  const [trendingFrozenIds, setTrendingFrozenIds] = useState<string[] | null>(null);
  const bumpTrendingOrder = useCallback(() => {
    setTrendingOrderTick((t) => t + 1);
  }, []);
  const prevPathnameRef = useRef(pathname);

  useLayoutEffect(() => {
    if (activeTab !== "trending") {
      setTrendingFrozenIds(null);
      return;
    }
    const cf = cardsForFeedRef.current;
    const act = activityRef.current;
    setTrendingFrozenIds(sortByTrending(cf, act).map((c) => resolveStableVoteCardId(c)));
  }, [activeTab, trendingOrderTick]);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (pathname === "/" && prev !== "/" && activeTabRef.current === "trending") {
      bumpTrendingOrder();
    }
  }, [pathname, bumpTrendingOrder]);

  useEffect(() => {
    let wasHidden = document.visibilityState === "hidden";
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
        return;
      }
      if (!wasHidden) return;
      wasHidden = false;
      if (activeTabRef.current === "trending") bumpTrendingOrder();
      void shared.refreshActivityIfStale();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [bumpTrendingOrder, shared.refreshActivityIfStale]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && activeTabRef.current === "trending") bumpTrendingOrder();
    };
    window.addEventListener("pageshow", onPageShow as EventListener);
    return () => window.removeEventListener("pageshow", onPageShow as EventListener);
  }, [bumpTrendingOrder]);

  const cardsForTab = useMemo(() => {
    switch (activeTab) {
      case "trending": {
        const sortedNow = sortByTrending(cardsForFeed, activity);
        if (trendingFrozenIds == null || trendingFrozenIds.length === 0) return sortedNow;
        const byId = new Map(sortedNow.map((c) => [resolveStableVoteCardId(c), c]));
        const out: VoteCardData[] = [];
        const used = new Set<string>();
        for (const id of trendingFrozenIds) {
          const c = byId.get(id);
          if (c) {
            out.push(c);
            used.add(id);
          }
        }
        for (const c of sortedNow) {
          const id = resolveStableVoteCardId(c);
          if (!used.has(id)) {
            out.push(c);
            used.add(id);
          }
        }
        return out;
      }
      case "new":
        return sortByNewest(cardsForFeed);
      case "community":
        return [];
      default:
        return publicCards;
    }
  }, [
    activeTab,
    cardsForFeed,
    activity,
    publicCards,
    trendingFrozenIds,
  ]);

  /** 実際にあるコレクションからランダム表示用プール */
  const timelineCollectionPool = useMemo(() => getTimelineCollectionPool(collections), [collections]);

  /** コミュニティタブ：公開コレクション（ピン留めを上に表示） */
  const communitiesForSection = useMemo(() => {
    const remotePublic = remotePopularCollections
      .filter((c) => c.visibility === "public")
      .map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        gradient: c.gradient as CollectionGradient | undefined,
        visibility: "public" as const,
        cardIds: c.cardIds,
      }));
    const other = getOtherUsersCollections();
    const mine = collections.filter((c) => c.visibility !== "member");
    const seen = new Set<string>();
    const combined = [...remotePublic, ...other, ...mine].filter((c) => {
      if (!c?.id) return false;
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    return sortCollectionsByPinned(combined, pinnedCollectionIds);
  }, [collections, pinnedCollectionIds, remotePopularCollections]);

  const displayedCommunities = useMemo(
    () => communitiesForSection.slice(0, communityVisibleCount),
    [communitiesForSection, communityVisibleCount]
  );

  useEffect(() => {
    if (activeTab !== "community") return;
    const root = communityLoadSentinelRef.current;
    if (!root) return;
    if (communitiesForSection.length <= communityVisibleCount) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCommunityVisibleCount((prev) =>
            Math.min(prev + COMMUNITY_LOAD_MORE, communitiesForSection.length)
          );
        }
      },
      { root: null, rootMargin: "280px 0px", threshold: 0 }
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, [activeTab, communitiesForSection.length, communityVisibleCount]);

  /** 急上昇・新着: VOTE＋差し込み */
  const timelineItems = useMemo(
    () => buildTimelineItems(cardsForTab, timelineCollectionPool),
    [cardsForTab, timelineCollectionPool]
  );

  /** シードVOTE廃止後も、カードが無いときは固定おすすめタグで埋める */
  const homeTagList = useMemo(() => {
    const fromCards = getTrendingTagsFromCards(allCardsFiltered).map((t) => t.tag).slice(0, 10);
    if (fromCards.length > 0) return fromCards;
    return [...recommendedTagList].slice(0, 10);
  }, [allCardsFiltered]);

  return (
    <div className="min-h-screen bg-[#F1F1F1]">
      <AppHeader type="logo" />

      {/* タブ：急上昇中 / 新着 / コミュニティ */}
      <FeedTabs activeId={activeTab} onSelect={selectFeedTab} />

      {/* メインコンテンツ（下ナビ分の余白を確保） */}
      <main className="mx-auto max-w-lg px-[5.333vw] pb-[50px] pt-4">
        {activeTab === "community" ? (
          <section className="flex flex-col gap-3">
            {collectionsIndexLoading && remotePopularCollections.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500" role="status" aria-live="polite">
                コミュニティを読み込み中…
              </p>
            ) : communitiesForSection.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                {isLoggedIn
                  ? "コミュニティがありません。マイページで作成しよう。"
                  : "コミュニティはありません。"}
              </p>
            ) : (
              <>
                {displayedCommunities.map((col, i) => (
                  <div
                    key={col.id}
                    className="[content-visibility:auto] [contain-intrinsic-size:auto_88px]"
                  >
                    <CollectionCard
                      id={col.id}
                      title={col.name}
                      gradient={col.gradient ?? COMMUNITY_GRADIENTS[i % COMMUNITY_GRADIENTS.length]}
                      showPin={
                        isCollectionPinnable(col.visibility) && pinnedCollectionIds.includes(col.id)
                      }
                      popularBanner
                      href={`/collection/${col.id}`}
                    />
                  </div>
                ))}
                {communitiesForSection.length > displayedCommunities.length ? (
                  <div ref={communityLoadSentinelRef} className="h-8 w-full shrink-0" aria-hidden />
                ) : null}
              </>
            )}
          </section>
        ) : allCardsFiltered.length > 0 ? (
          <>
            {!activityBootstrapDone && (
              <p
                className="mb-3 text-center text-xs leading-relaxed text-[#787878]"
                role="status"
                aria-live="polite"
              >
                最新を取得中…
              </p>
            )}
            <VoteCardList>
              {(activeTab === "trending" || activeTab === "new") && cardsForTab.length === 0 ? (
                <div className="vote-card-outer px-6 py-12 text-center">
                  <p className="text-sm text-gray-600">
                    まだ投票できる投稿がありません。
                  </p>
                </div>
              ) : null}

              <HomeTimelineFeed
                key={activeTab}
                timelineItems={timelineItems}
                timelineTagList={homeTagList}
                activity={activity}
                commentedCardIdSet={commentedCardIdSet}
                bookmarkedIds={bookmarkedIds}
                currentUser={currentUser}
                handleVote={handleVote}
                onBookmarkClick={setModalCardId}
                onMoreClick={handleCardMoreClick}
              />
            </VoteCardList>
          </>
        ) : (
          <HomeLoadingMessage />
        )}
      </main>

      {modalCardId != null && (
        <BookmarkCollectionModal
          cardId={modalCardId}
          onClose={() => setModalCardId(null)}
          isLoggedIn={currentUser.type === "sns"}
          onCollectionsUpdated={refreshCollections}
        />
      )}

      <CardModerationModals
        cardOptionsCardId={moderation.cardOptionsCardId}
        cardOptionsIsOwnCard={moderation.cardOptionsIsOwnCard}
        reportCardId={moderation.reportCardId}
        onCloseOptions={moderation.closeCardOptions}
        onHideCard={(cardId) => {
          const card = allCards.find((c) => resolveStableVoteCardId(c) === cardId);
          if (card?.createdByUserId) addHiddenUser(card.createdByUserId);
          addHiddenCard(cardId);
          setHiddenUserIds(getHiddenUserIds());
          setHiddenCardIds(getHiddenCardIds());
          moderation.closeCardOptions();
        }}
        onReportCard={moderation.openReport}
        onCloseReport={moderation.closeReport}
      />
    </div>
  );
}

function HomeFallback() {
  return (
    <div className="min-h-screen bg-[#F1F1F1]">
      <AppHeader type="logo" />
      <main className="mx-auto max-w-lg px-[5.333vw] pb-[50px] pt-4">
        <HomeLoadingMessage />
      </main>
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
