"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  Suspense,
  useDeferredValue,
  startTransition,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import {
  voteCardsData,
  CARD_BACKGROUND_IMAGES,
  resolveStableVoteCardId,
  recommendedTagList,
} from "../data/voteCards";
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
  getTrendingTagsFromCards,
  popularCollections,
  searchCollections,
  searchVoteCardsByKeyword,
  type CollectionGradient,
  type PopularCollection,
} from "../data/search";

function backgroundForSearchCard(card: VoteCardData, cardId: string): string {
  if (card.backgroundImageUrl) return card.backgroundImageUrl;
  const cached = backgroundCache.get(cardId);
  if (cached) return cached;
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = ((h << 5) - h + cardId.charCodeAt(i)) | 0;
  const url = CARD_BACKGROUND_IMAGES[Math.abs(h) % CARD_BACKGROUND_IMAGES.length];
  backgroundCache.set(cardId, url);
  return url;
}

const backgroundCache = new Map<string, string>();

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
  const router = useRouter();
  const tagFromUrl = searchParams.get("tag") ?? "";
  const qFromUrl = searchParams.get("q") ?? "";
  /** 2回目の Enter で VOTE 検索結果へ（URL の `vote=1` と同期） */
  const voteResultsFromUrl = searchParams.get("vote") === "1";
  const [searchValue, setSearchValue] = useState(() => tagFromUrl || qFromUrl);
  /** 1回目の Enter で確定したキーワード（タグ・コレ表示用。URL の q と同期） */
  const [confirmedKeywordForBrowse, setConfirmedKeywordForBrowse] = useState(() =>
    tagFromUrl.length > 0 ? "" : qFromUrl
  );
  /** 2回目の Enter で確定したキーワード（一致する VOTE のみ表示） */
  const [committedVoteQuery, setCommittedVoteQuery] = useState(() => {
    if (tagFromUrl.length > 0) return "";
    return voteResultsFromUrl ? qFromUrl : "";
  });
  const [activeTab, setActiveTab] = useState<"trending" | "collections" | "favorite">("trending");
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
  /** 注目タグの表示件数（スクロールで段階的に追加） */
  const [trendingTagsVisibleCount, setTrendingTagsVisibleCount] = useState(5);
  /** コレクションタブ：初回件数＋スクロールで追加 */
  const [popularCollectionsVisibleCount, setPopularCollectionsVisibleCount] = useState(8);
  /** VOTE 検索結果の段階表示 */
  const [voteSearchVisibleCount, setVoteSearchVisibleCount] = useState(8);
  const restoredUiStateRef = useRef(false);
  const trendingLoadSentinelRef = useRef<HTMLDivElement | null>(null);
  const collectionsLoadSentinelRef = useRef<HTMLDivElement | null>(null);
  const voteSearchLoadSentinelRef = useRef<HTMLDivElement | null>(null);
  const [pinnedCollectionIds, setPinnedCollectionIds] = useState<string[]>([]);
  const [collections, setCollections] = useState<ReturnType<typeof getCollections>>([]);
  const [remotePopularCollections, setRemotePopularCollections] = useState<
    Array<{ id: string; name: string; color: string; gradient?: string; visibility: string; cardIds: string[] }>
  >([]);
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
    const syncLists = () => {
      setAuth(getAuth());
      setFavoriteTags(getFavoriteTags());
      setCollections(getCollections());
      setPinnedCollectionIds(getPinnedCollectionIds());
    };
    syncLists();
    window.addEventListener(getAuthUpdatedEventName(), syncLists);
    window.addEventListener(PINNED_UPDATED_EVENT, syncLists);
    window.addEventListener(getCollectionsUpdatedEventName(), syncLists);
    return () => {
      window.removeEventListener(getAuthUpdatedEventName(), syncLists);
      window.removeEventListener(PINNED_UPDATED_EVENT, syncLists);
      window.removeEventListener(getCollectionsUpdatedEventName(), syncLists);
    };
  }, []);

  // 検索画面の「人気コレクション」候補をKVから取得（初回ペイントを塞ぎにくくする）
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      void (async () => {
        try {
          const res = await fetch("/api/collections");
          if (!res.ok) return;
          const data = (await res.json()) as { collections?: unknown };
          const list = Array.isArray(data?.collections) ? (data.collections as unknown[]) : [];
          const normalized = list
            .map((v) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null))
            .filter((v): v is Record<string, unknown> => v != null)
            .map((o) => ({
              id: typeof o.id === "string" ? o.id : "",
              name: typeof o.name === "string" ? o.name : "",
              color: typeof o.color === "string" ? o.color : "#E5E7EB",
              gradient: typeof o.gradient === "string" ? (o.gradient as string) : undefined,
              visibility: typeof o.visibility === "string" ? o.visibility : "public",
              cardIds: Array.isArray(o.cardIds) ? o.cardIds.filter((x): x is string => typeof x === "string") : [],
            }))
            .filter((c) => c.id.length > 0);
          if (!cancelled) {
            startTransition(() => {
              setRemotePopularCollections(normalized);
            });
          }
        } catch {
          // ignore
        }
      })();
    };
    let idleHandle: number | ReturnType<typeof setTimeout> = 0;
    let usedIdleCallback = false;
    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      usedIdleCallback = true;
      idleHandle = window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      idleHandle = setTimeout(run, 1);
    }
    return () => {
      cancelled = true;
      if (usedIdleCallback && typeof window !== "undefined" && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle as number);
      } else {
        clearTimeout(idleHandle as ReturnType<typeof setTimeout>);
      }
    };
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

  /** URL の tag / q と入力欄を同期（?tag= の画面で別キーワードに変えたら /search?q= に遷移してキーワード検索へ） */
  useEffect(() => {
    if (tagFromUrl.length > 0) {
      setSearchValue(tagFromUrl);
      setConfirmedKeywordForBrowse("");
      setCommittedVoteQuery("");
    } else {
      setSearchValue(qFromUrl);
      setConfirmedKeywordForBrowse(qFromUrl);
      setCommittedVoteQuery(voteResultsFromUrl ? qFromUrl : "");
    }
  }, [tagFromUrl, qFromUrl, voteResultsFromUrl]);

  const handleSearchValueChange = useCallback(
    (v: string) => {
      setSearchValue(v);
      if (isTagFilterView && v.trim() !== tagFromUrl.trim()) {
        const t = v.trim();
        router.replace(t ? `/search?q=${encodeURIComponent(t)}` : "/search");
        return;
      }
      if (!isTagFilterView) {
        const t = v.trim();
        setConfirmedKeywordForBrowse((prev) => (t === prev ? prev : ""));
        setCommittedVoteQuery((prev) => (t === prev ? prev : ""));
      }
      if (!isTagFilterView && qFromUrl.length > 0 && v.trim() === "") {
        router.replace("/search");
      }
    },
    [isTagFilterView, tagFromUrl, qFromUrl, router]
  );

  const handleKeywordSearchSubmit = useCallback(
    (value: string) => {
      if (isTagFilterView) return;
      const t = value.trim();
      if (!t) {
        setConfirmedKeywordForBrowse("");
        setCommittedVoteQuery("");
        router.replace("/search");
        return;
      }
      if (committedVoteQuery === t) {
        return;
      }
      if (confirmedKeywordForBrowse === t && committedVoteQuery === "") {
        setCommittedVoteQuery(t);
        router.replace(`/search?q=${encodeURIComponent(t)}&vote=1`);
        return;
      }
      setConfirmedKeywordForBrowse(t);
      setCommittedVoteQuery("");
      router.replace(`/search?q=${encodeURIComponent(t)}`);
    },
    [isTagFilterView, router, confirmedKeywordForBrowse, committedVoteQuery]
  );

  useEffect(() => {
    setTagListSortOrder("newest");
  }, [tagFromUrl]);

  const UI_STATE_KEY = "vote_search_ui_state_v1";
  const saveUiState = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isTagFilterView) return;
    try {
      const state = {
        activeTab,
        trendingTagsVisibleCount,
        popularCollectionsVisibleCount,
        voteSearchVisibleCount,
        scrollY: window.scrollY,
      };
      window.sessionStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [activeTab, isTagFilterView, trendingTagsVisibleCount, popularCollectionsVisibleCount, voteSearchVisibleCount]);

  // 戻るで復元（TOP表示のときだけ）
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isTagFilterView) return;
    if (tagFromUrl.length > 0 || qFromUrl.length > 0 || committedVoteQuery.length > 0) return;
    try {
      const raw = window.sessionStorage.getItem(UI_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        activeTab: "trending" | "collections" | "favorite";
        trendingTagsVisibleCount: number;
        popularCollectionsVisibleCount: number;
        voteSearchVisibleCount: number;
        scrollY: number;
      }>;
      if (parsed.activeTab === "trending" || parsed.activeTab === "collections" || parsed.activeTab === "favorite") {
        setActiveTab(parsed.activeTab);
      }
      if (typeof parsed.trendingTagsVisibleCount === "number" && parsed.trendingTagsVisibleCount > 0) {
        setTrendingTagsVisibleCount(parsed.trendingTagsVisibleCount);
      }
      if (typeof parsed.popularCollectionsVisibleCount === "number" && parsed.popularCollectionsVisibleCount > 0) {
        setPopularCollectionsVisibleCount(parsed.popularCollectionsVisibleCount);
      }
      if (typeof parsed.voteSearchVisibleCount === "number" && parsed.voteSearchVisibleCount > 0) {
        setVoteSearchVisibleCount(parsed.voteSearchVisibleCount);
      }
      if (typeof parsed.scrollY === "number" && parsed.scrollY >= 0) {
        requestAnimationFrame(() => window.scrollTo(0, parsed.scrollY ?? 0));
      }
      restoredUiStateRef.current = true;
    } catch {
      // ignore
    }
  }, [isTagFilterView, tagFromUrl, qFromUrl, committedVoteQuery]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPageHide = () => saveUiState();
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [saveUiState]);

  useEffect(() => {
    saveUiState();
  }, [saveUiState]);
  useEffect(() => {
    // 戻る復元の直後は初期化しない（表示件数が5に戻るのを防ぐ）
    if (restoredUiStateRef.current) {
      restoredUiStateRef.current = false;
      return;
    }
    setPopularCollectionsVisibleCount(8);
    setTrendingTagsVisibleCount(5);
    setVoteSearchVisibleCount(8);
  }, [tagFromUrl, qFromUrl, activeTab, committedVoteQuery]);

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
  /** 人気コレ（デモ）＋自分・他人の登録コレクション名の部分一致 */
  const matchedCollectionsRaw = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as PopularCollection[];
    const seen = new Set<string>();
    const out: PopularCollection[] = [];
    const other = getOtherUsersCollections();
    const mine = collections.filter((c) => c.visibility !== "member");
    for (const c of [...other, ...mine]) {
      if (!c.name.toLowerCase().includes(q)) continue;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({
        id: c.id,
        title: c.name,
        gradient: (c.gradient ?? "orange-yellow") as CollectionGradient,
        showPin: pinnedCollectionIds.includes(c.id),
        voteScore: 0,
      });
    }
    for (const p of searchCollections(query)) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [query, collections, pinnedCollectionIds]);
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
    // KVから取れたらそれを優先（メンバー限定はリンク共有前提なので人気枠では public のみ表示）
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
    const mine = collections.filter((c) => c.visibility !== "member");
    // 同じコレが remote + local 両方に存在すると二重表示になるので id で重複排除（remote を優先）
    const seen = new Set<string>();
    const combined = [...remotePublic, ...other, ...mine].filter((c) => {
      if (!c?.id) return false;
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    return combined.sort((a, b) => {
      const aPin = pinnedCollectionIds.includes(a.id);
      const bPin = pinnedCollectionIds.includes(b.id);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      if (aPin && bPin)
        return pinnedCollectionIds.indexOf(a.id) - pinnedCollectionIds.indexOf(b.id);
      return 0;
    });
  }, [collections, pinnedCollectionIds, remotePopularCollections]);
  const displayedCollectionsForSection = useMemo(
    () => collectionsForSection.slice(0, popularCollectionsVisibleCount),
    [collectionsForSection, popularCollectionsVisibleCount]
  );

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

  /** activity の高頻度更新で注目タグ計算が主スレッドを占有しないよう遅延反映 */
  const deferredActivityForTags = useDeferredValue(activity);

  /** 質問・選択肢・タグなど本文のキーワード一致（Enter 確定後の語のみ。件数はスクロールで増やす） */
  const matchedVoteCardsFull = useMemo(
    () => searchVoteCardsByKeyword(committedVoteQuery, allCardsForTagsFiltered, 80),
    [committedVoteQuery, allCardsForTagsFiltered]
  );
  const matchedVoteCards = useMemo(
    () => matchedVoteCardsFull.slice(0, voteSearchVisibleCount),
    [matchedVoteCardsFull, voteSearchVisibleCount]
  );

  /** 注目タグ（スコア順：投票+1, コメント+3, bookmark+5, 新着+2, お気に入り+3） */
  const trendingTagsByScore = useMemo(
    () => getTrendingTagsByScore(allCardsForTagsFiltered, deferredActivityForTags, favoriteTags),
    [allCardsForTagsFiltered, deferredActivityForTags, favoriteTags]
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
    // タグ一覧の候補カードだけ（全カード走査を避けて表示を軽くする）
    for (const card of filteredCards) {
      const cid = resolveStableVoteCardId(card);
      const a = activity[cid];
      if ((a?.comments ?? []).some((c) => isCommentAuthoredByCurrentUser(c.user?.name, opts))) {
        set.add(cid);
      }
    }
    return set;
  }, [filteredCards, activity, auth.isLoggedIn, auth.user?.name]);

  /** 検索結果タイムライン用：実際にあるコレクションから1件（プール内容から決定的に選択し再レイアウトを抑制） */
  const randomCollectionForTimeline = useMemo(() => {
    const remotePublic = remotePopularCollections
      .filter((c) => c.visibility === "public")
      .map((c) => ({
        id: c.id,
        title: c.name,
        gradient: (c.gradient ?? "orange-yellow") as CollectionGradient,
      }));
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
    const seen = new Set<string>();
    const pool = [...remotePublic, ...popularCollections, ...other, ...mine].filter((c) => {
      if (!c?.id) return false;
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    if (pool.length === 0) return null;
    const sig = pool.map((p) => p.id).join("\n");
    let h = 0;
    for (let i = 0; i < sig.length; i++) h = ((h << 5) - h + sig.charCodeAt(i)) | 0;
    return pool[Math.abs(h) % pool.length];
  }, [collections, remotePopularCollections]);

  const tagFilterRecommendedTags = useMemo(() => {
    const fromCards = getTrendingTagsFromCards(allCardsForTagFilterFiltered).map((t) => t.tag).slice(0, 10);
    if (fromCards.length > 0) return fromCards;
    return [...recommendedTagList].slice(0, 10);
  }, [allCardsForTagFilterFiltered]);

  /** ON: 全カード表示（投票済み含む） / OFF: ユーザーが投票していないカードのみ */
  const cardsToShow = useMemo(() => {
    if (showVoted) return filteredCards;
    return filteredCards.filter((card) => {
      const cardId = resolveStableVoteCardId(card);
      if (keepVotedCardVisible[cardId]) return true;
      return !activity[cardId]?.userSelectedOption;
    });
  }, [filteredCards, showVoted, activity, keepVotedCardVisible]);

  const voteCardViewModels = useMemo(() => {
    // 表示用に必要なものをまとめて前計算し、render 中の work を減らす
    return cardsToShow.map((card) => {
      const cardId = resolveStableVoteCardId(card);
      const act = activity[cardId];
      const merged = getMergedCounts(
        card.countA ?? 0,
        card.countB ?? 0,
        card.commentCount ?? 0,
        act ?? { countA: 0, countB: 0, comments: [] }
      );
      const bgUrl = card.backgroundImageUrl ?? backgroundForSearchCard(card, cardId);
      return { card, cardId, act, merged, bgUrl };
    });
  }, [cardsToShow, activity]);
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
      const card = allCardsForTagFilterFiltered.find((c) => resolveStableVoteCardId(c) === cardId);
      setCardOptionsIsOwnCard(card?.createdByUserId === getCurrentActivityUserId());
    },
    [allCardsForTagFilterFiltered]
  );

  useEffect(() => {
    if (activeTab !== "trending") return;
    const root = trendingLoadSentinelRef.current;
    if (!root) return;
    if (displayedTrendingTags.length <= trendingTagsVisibleCount) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setTrendingTagsVisibleCount((prev) => Math.min(prev + 10, displayedTrendingTags.length));
        }
      },
      { root: null, rootMargin: "280px 0px", threshold: 0 }
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, [activeTab, displayedTrendingTags.length, trendingTagsVisibleCount]);

  useEffect(() => {
    if (activeTab !== "collections") return;
    const root = collectionsLoadSentinelRef.current;
    if (!root) return;
    if (collectionsForSection.length <= popularCollectionsVisibleCount) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPopularCollectionsVisibleCount((prev) => Math.min(prev + 8, collectionsForSection.length));
        }
      },
      { root: null, rootMargin: "280px 0px", threshold: 0 }
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, [activeTab, collectionsForSection.length, popularCollectionsVisibleCount]);

  useEffect(() => {
    if (committedVoteQuery.length === 0) return;
    const root = voteSearchLoadSentinelRef.current;
    if (!root) return;
    if (matchedVoteCardsFull.length <= voteSearchVisibleCount) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVoteSearchVisibleCount((prev) => Math.min(prev + 8, matchedVoteCardsFull.length));
        }
      },
      { root: null, rootMargin: "280px 0px", threshold: 0 }
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, [committedVoteQuery, matchedVoteCardsFull.length, voteSearchVisibleCount]);

  return (
    <div
      className={`min-h-screen pb-[50px] ${isTagFilterView ? "bg-[#F1F1F1]" : "bg-white"}`}
    >
      {/* 虫眼鏡で開いた時→(2)検索 / ハッシュタグタップで開いた時→(3)ハッシュタグ */}
      <AppHeader
        type={isTagFilterView ? "hashtag" : "search"}
        value={searchValue}
        onChange={handleSearchValueChange}
        {...(!isTagFilterView && { onSubmit: handleKeywordSearchSubmit })}
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
                voteCardViewModels.map(({ card, cardId, act, merged, bgUrl }) => {
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
                      periodStart={card.periodStart}
                      periodEnd={card.periodEnd}
                      commentsDisabled={card.commentsDisabled === true}
                    />
                  );
                })
              )}
              <RecommendedTags tags={tagFilterRecommendedTags} />
              {randomCollectionForTimeline && (
                <CollectionCard
                  key={randomCollectionForTimeline.id}
                  id={randomCollectionForTimeline.id}
                  title={randomCollectionForTimeline.title}
                  gradient={randomCollectionForTimeline.gradient}
                  titleVariant="blackBlock"
                  href={`/collection/${randomCollectionForTimeline.id}`}
                  timelineBanner
                  label="コレクション"
                />
              )}
            </div>
          </main>
          <BottomNav activeId="search" />
        </>
      )}

      {/* 虫眼鏡タップで開いたとき：新しい検索画面（注目タグ / コレクション / お気に入りタグ） */}
      {!isTagFilterView && (
        <>
          {/* タブ：注目タグ / コレクション / お気に入りタグ */}
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
                    onClick={() => setActiveTab("collections")}
                    className={`relative flex flex-1 min-w-0 flex-col pt-[14.4px] pb-[11.4px] text-sm font-bold ${
                      activeTab === "collections" ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    <span className="flex-1" aria-hidden />
                    <span className="inline-flex items-center justify-center gap-1">
                      <img src="/icons/bookmark.svg" alt="" className="h-4 w-4 shrink-0" width={16} height={16} />
                      コレクション
                    </span>
                    {activeTab === "collections" && (
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
              <div className="h-px bg-[#E5E7EB]" aria-hidden />
            </>
          )}

          <main className="mx-auto max-w-lg bg-white pb-[50px]">
        {!isSearching ? (
          <>
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
                      {displayedTrendingTags.length > trendingTagsVisibleCount ? (
                        <div ref={trendingLoadSentinelRef} className="h-8 w-full shrink-0" aria-hidden />
                      ) : null}
                    </>
                  )}
                </div>
              </section>
            )}

            {activeTab === "collections" && (
              <section className="border-b border-gray-200 pt-2.5">
                <div className="flex flex-col gap-3 px-[5.333vw] pb-5 pt-1">
                  {collectionsForSection.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">
                      {isLoggedIn ? "コレクションがありません。マイページで作成しよう。" : "コレクションはありません。"}
                    </p>
                  ) : (
                    <>
                      {displayedCollectionsForSection.map((col, i) => (
                        <div
                          key={col.id}
                          className="[content-visibility:auto] [contain-intrinsic-size:auto_88px]"
                        >
                          <CollectionCard
                            id={col.id}
                            title={col.name}
                            gradient={col.gradient ?? PINNED_GRADIENTS[i % PINNED_GRADIENTS.length]}
                            showPin={pinnedCollectionIds.includes(col.id)}
                            popularBanner
                            href={`/collection/${col.id}`}
                          />
                        </div>
                      ))}
                      {collectionsForSection.length > displayedCollectionsForSection.length ? (
                        <div ref={collectionsLoadSentinelRef} className="h-8 w-full shrink-0" aria-hidden />
                      ) : null}
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
          </>
        ) : (
          <>
            {committedVoteQuery.length === 0 ? (
              <>
                {/* 検索時：1回目 Enter 後（同一キーワードで再 Enter で VOTE 結果へ） */}
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

                <section>
                  <SectionHeader>コレクション</SectionHeader>
                  <div className="flex flex-col gap-3 px-[5.333vw] pt-4 pb-5">
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
                          popularBanner
                          href={`/collection/${col.id}`}
                        />
                      ))
                    )}
                  </div>
                </section>
              </>
            ) : (
              /* 2回目 Enter 後：一致する VOTE のみ（URL は vote=1） */
              <section className="border-b border-gray-200">
                <SectionHeader>「{committedVoteQuery}」に一致するVOTE</SectionHeader>
                <div className="flex flex-col gap-[5.333vw] px-[5.333vw] py-4">
                  {matchedVoteCardsFull.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">一致するVOTEはありません。</p>
                  ) : (
                    <>
                      {matchedVoteCards.map((card) => {
                        const cardId = resolveStableVoteCardId(card);
                        const act = activity[cardId];
                        const merged = getMergedCounts(
                          card.countA ?? 0,
                          card.countB ?? 0,
                          card.commentCount ?? 0,
                          act ?? { countA: 0, countB: 0, comments: [] }
                        );
                        return (
                          <div
                            key={cardId}
                            className="[content-visibility:auto] [contain-intrinsic-size:auto_380px]"
                          >
                            <VoteCard
                              backgroundImageUrl={backgroundForSearchCard(card, cardId)}
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
                              periodStart={card.periodStart}
                              periodEnd={card.periodEnd}
                              commentsDisabled={card.commentsDisabled === true}
                            />
                          </div>
                        );
                      })}
                      {matchedVoteCardsFull.length > voteSearchVisibleCount ? (
                        <div ref={voteSearchLoadSentinelRef} className="h-8 w-full shrink-0" aria-hidden />
                      ) : null}
                    </>
                  )}
                </div>
              </section>
            )}
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
            const card = allCardsForTagFilter.find((c) => resolveStableVoteCardId(c) === cardId);
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
