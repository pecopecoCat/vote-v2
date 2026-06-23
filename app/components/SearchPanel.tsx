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
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import AppHeader from "./AppHeader";
import CollectionCard from "./CollectionCard";
import RecommendedTags from "./RecommendedTags";
import VoteCard from "./VoteCard";
import { VoteCardList, VoteCardMasonryTile } from "./VoteCardList";
import CardModerationModals from "./CardModerationModals";
import TagListRow from "./TagListRow";
import TagMenuModal, { type TagMenuVariant } from "./TagMenuModal";
import ShowVotedFilterBar from "./ShowVotedFilterBar";
import EmptyStatePanel from "./EmptyStatePanel";
import UnderlineTabBar, { type UnderlineTabItem } from "./UnderlineTabBar";
import type { VoteCardData } from "../data/voteCards";
import { voteCardsData, resolveStableVoteCardId, recommendedTagList } from "../data/voteCards";
import { getMergedCounts, isCommentAuthoredByCurrentUser, type CardActivity } from "../data/voteCardActivity";
import { useSharedData } from "../context/SharedDataContext";
import { toggleFavoriteTag, isFavoriteTag } from "../data/favoriteTags";
import { isHiddenTag } from "../data/hiddenTags";
import { getOtherUsersCollections, isCollectionPinnable } from "../data/collections";
import { isCardBookmarked } from "../data/bookmarks";
import { getCurrentActivityUserId } from "../data/auth";
import { useAuthState } from "../hooks/useAuthState";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useFavoriteTags } from "../hooks/useFavoriteTags";
import { useLocalCollections } from "../hooks/useLocalCollections";
import { useShowVotedPreference } from "../hooks/useShowVotedPreference";
import { useSearchCollectionsWarm } from "../hooks/useSearchCollectionsWarm";
import { useCardModerationFlow } from "../hooks/useCardModerationFlow";
import {
  getHiddenUserIds,
  addHiddenUser,
  getHiddenUsersUpdatedEventName,
} from "../data/hiddenUsers";
import {
  getHiddenCardIds,
  addHiddenCard,
  getHiddenCardsUpdatedEventName,
} from "../data/hiddenCards";
import {
  getTrendingTagsByScore,
  getTrendingTagsFromCards,
  popularCollections,
  searchCollections,
  searchVoteCardsByKeyword,
  type CollectionGradient,
  type PopularCollection,
} from "../data/search";
import { perfMeasure } from "../lib/perf";
import { buildVoteCardProps } from "../lib/buildVoteCardProps";
import { resolveCardBackgroundUrl } from "../lib/resolveCardBackgroundUrl";
import { sortCollectionsByPinned } from "../lib/sortCollectionsByPinned";

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

type SearchTabId = "trending" | "favorite";

function parseSearchTabFromUrl(tab: string | null): SearchTabId {
  if (tab === "favorite") return tab;
  if (tab === "collections") return "trending";
  return "trending";
}

export type SearchPanelProps = {
  presentation?: "page" | "overlay";
  onClose?: () => void;
};

function SearchPanelInner({ presentation = "page", onClose }: SearchPanelProps) {
  const isOverlay = presentation === "overlay";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsKey = searchParams.toString();
  const tagFromUrl = searchParams.get("tag") ?? "";
  const qFromUrl = searchParams.get("q") ?? "";
  const tabFromUrl = searchParams.get("tab");
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
  const [activeTab, setActiveTab] = useState<SearchTabId>(() => parseSearchTabFromUrl(tabFromUrl));
  const { showVoted, handleShowVotedChange } = useShowVotedPreference();
  /** ハッシュタグ一覧の並び（マイページ等と同じプルダウン） */
  const [tagListSortOrder, setTagListSortOrder] = useState<"newest" | "oldest">("newest");
  const shared = useSharedData();
  const { createdVotesForTimeline, activity, addVote: sharedAddVote } = shared;
  const auth = useAuthState();
  const isLoggedIn = auth.isLoggedIn;
  const currentUser = useCurrentUser(auth);
  const { favoriteTags, setFavoriteTags, refreshFavoriteTags } = useFavoriteTags();
  const { collections, pinnedCollectionIds, refreshCollections } = useLocalCollections();
  const moderation = useCardModerationFlow();
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>(() => getHiddenUserIds());
  const [hiddenCardIds, setHiddenCardIds] = useState<string[]>(() => getHiddenCardIds());
  const hiddenCardIdSet = useMemo(() => new Set(hiddenCardIds), [hiddenCardIds]);
  const hiddenUserIdSet = useMemo(() => new Set(hiddenUserIds), [hiddenUserIds]);
  const [tagMenu, setTagMenu] = useState<{ tag: string; variant: TagMenuVariant } | null>(null);
  const [hiddenTagsVersion, setHiddenTagsVersion] = useState(0);
  /** 注目タグの表示件数（スクロールで段階的に追加） */
  const [trendingTagsVisibleCount, setTrendingTagsVisibleCount] = useState(5);
  /** VOTE 検索結果の段階表示 */
  const [voteSearchVisibleCount, setVoteSearchVisibleCount] = useState(8);
  const restoredUiStateRef = useRef(false);
  const trendingLoadSentinelRef = useRef<HTMLDivElement | null>(null);
  const voteSearchLoadSentinelRef = useRef<HTMLDivElement | null>(null);
  const { remotePopularCollections } = useSearchCollectionsWarm(
    isLoggedIn,
    activeTab,
    refreshCollections
  );

  /** ハッシュタグタップで開いたとき（?tag=xxx）→ 従来のカード一覧。虫眼鏡タップ（/search）→ 新しい検索画面 */
  const isTagFilterView = tagFromUrl.length > 0;

  /** ブラウザの戻る／進む・URL直打ちでタブを URL と一致させる */
  useEffect(() => {
    if (isTagFilterView) return;
    setActiveTab(parseSearchTabFromUrl(tabFromUrl));
  }, [tabFromUrl, isTagFilterView]);

  const selectSearchTab = useCallback(
    (id: SearchTabId) => {
      setActiveTab(id);
      if (isTagFilterView) return;
      const params = new URLSearchParams(searchParamsKey);
      if (id === "trending") {
        params.delete("tab");
      } else {
        params.set("tab", id);
      }
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      /** オーバーレイ時は router.replace しない（パネル再マウント＝スライドアニメーション防止） */
      if (isOverlay) {
        window.history.replaceState(window.history.state, "", nextUrl);
        return;
      }
      router.replace(nextUrl, { scroll: false });
    },
    [isTagFilterView, pathname, router, searchParamsKey, isOverlay]
  );

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
        trendingTagsVisibleCount,
        voteSearchVisibleCount,
        scrollY: window.scrollY,
      };
      window.sessionStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [isTagFilterView, trendingTagsVisibleCount, voteSearchVisibleCount]);

  // 戻るで復元（TOP表示のときだけ）
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isTagFilterView) return;
    if (tagFromUrl.length > 0 || qFromUrl.length > 0 || committedVoteQuery.length > 0) return;
    try {
      const raw = window.sessionStorage.getItem(UI_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        trendingTagsVisibleCount: number;
        voteSearchVisibleCount: number;
        scrollY: number;
      }>;
      // 旧 sessionStorage の activeTab を URL に移行（戻る復元用）
      const legacyActiveTab = (parsed as { activeTab?: string }).activeTab;
      if (!tabFromUrl && legacyActiveTab === "favorite") {
        setActiveTab("favorite");
        const params = new URLSearchParams(searchParamsKey);
        params.set("tab", legacyActiveTab);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }
      if (typeof parsed.trendingTagsVisibleCount === "number" && parsed.trendingTagsVisibleCount > 0) {
        setTrendingTagsVisibleCount(parsed.trendingTagsVisibleCount);
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
  }, [
    isTagFilterView,
    tagFromUrl,
    qFromUrl,
    committedVoteQuery,
    tabFromUrl,
    pathname,
    router,
    searchParamsKey,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPageHide = () => saveUiState();
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [saveUiState]);

  useEffect(() => {
    const t = window.setTimeout(() => saveUiState(), 500);
    return () => window.clearTimeout(t);
  }, [saveUiState]);
  useEffect(() => {
    // 戻る復元の直後は初期化しない（表示件数が5に戻るのを防ぐ）
    if (restoredUiStateRef.current) {
      restoredUiStateRef.current = false;
      return;
    }
    setTrendingTagsVisibleCount(5);
    setVoteSearchVisibleCount(8);
  }, [tagFromUrl, qFromUrl, committedVoteQuery]);

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
        showPin: isCollectionPinnable(c.visibility) && pinnedCollectionIds.includes(c.id),
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
    () => sortCollectionsByPinned(matchedCollectionsRaw, pinnedCollectionIds),
    [matchedCollectionsRaw, pinnedCollectionIds]
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
  useEffect(() => {
    const handler = () => setHiddenCardIds(getHiddenCardIds());
    window.addEventListener(getHiddenCardsUpdatedEventName(), handler);
    return () => window.removeEventListener(getHiddenCardsUpdatedEventName(), handler);
  }, []);

  /** 非表示ユーザー・カードを除いた一覧（タグフィルター・注目タグ用） */
  const allCardsForTagsFiltered = useMemo(
    () =>
      allCardsForTags.filter((c) => {
        const cardId = resolveStableVoteCardId(c);
        if (hiddenCardIdSet.has(cardId)) return false;
        if (c.createdByUserId && hiddenUserIdSet.has(c.createdByUserId)) return false;
        return true;
      }),
    [allCardsForTags, hiddenUserIdSet, hiddenCardIdSet]
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

  const searchTabItems = useMemo(
    (): UnderlineTabItem<SearchTabId>[] => [
      {
        id: "trending",
        label: "注目タグ",
        icon: { type: "mask", src: "/icons/icon_chumoku.svg", width: 18, height: 9 },
      },
      {
        id: "favorite",
        label: "お気に入りタグ",
        icon: {
          type: "img",
          src: "/icons/icon_heart.svg",
          activeSrc: favoriteTags.length > 0 ? "/icons/icon_heart_on.svg" : undefined,
          width: 18,
          height: 16,
        },
      },
    ],
    [favoriteTags.length]
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
      allCardsForTagFilter.filter((c) => {
        const cardId = resolveStableVoteCardId(c);
        if (hiddenCardIdSet.has(cardId)) return false;
        if (c.createdByUserId && hiddenUserIdSet.has(c.createdByUserId)) return false;
        return true;
      }),
    [allCardsForTagFilter, hiddenUserIdSet, hiddenCardIdSet]
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
    return perfMeasure("search.voteCardViewModels", () => {
      // 表示用に必要なものをまとめて前計算し、render 中の work を減らす
      return cardsToShow.map((card) => {
        const cardId = resolveStableVoteCardId(card);
        const act = activity[cardId];
        const bgUrl = resolveCardBackgroundUrl(card, cardId);
        return { card, cardId, act, bgUrl };
      });
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
      const card = allCardsForTagFilterFiltered.find((c) => resolveStableVoteCardId(c) === cardId);
      moderation.openCardOptions(cardId, card?.createdByUserId === getCurrentActivityUserId());
    },
    [allCardsForTagFilterFiltered, moderation]
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
      className={
        isOverlay
          ? `flex min-h-0 flex-1 flex-col overflow-y-auto ${isTagFilterView ? "bg-[#F1F1F1]" : "bg-white"}`
          : `min-h-screen pb-[50px] ${isTagFilterView ? "bg-[#F1F1F1]" : "bg-white"}`
      }
    >
      {/* 虫眼鏡で開いた時→(2)検索 / ハッシュタグタップで開いた時→(3)ハッシュタグ */}
      <AppHeader
        type={isTagFilterView ? "hashtag" : "search"}
        value={searchValue}
        onChange={handleSearchValueChange}
        {...(!isTagFilterView && { onSubmit: handleKeywordSearchSubmit })}
        {...(isOverlay && onClose ? { onBack: onClose } : {})}
        {...(isTagFilterView && {
          onFavoriteClick: (tag) => {
            toggleFavoriteTag(tag);
            refreshFavoriteTags();
          },
          isFavorite: isFavoriteTag(searchValue.trim()),
        })}
      />

      {/* ハッシュタグから開いたとき：従来のカード一覧（新着順・投票済みを表示） */}
      {isTagFilterView && (
        <>
          <ShowVotedFilterBar
            className="sticky top-[64px] z-10 bg-[#F1F1F1] px-[5.333vw] py-3"
            sortOrder={tagListSortOrder}
            onSortOrderChange={setTagListSortOrder}
            showVoted={showVoted}
            onShowVotedChange={handleShowVotedChange}
          />
          <main
            className={
              isOverlay
                ? "home-feed-main mx-auto flex-1 px-[5.333vw] pb-[env(safe-area-inset-bottom,0px)] pt-6 sm:px-6"
                : "home-feed-main mx-auto px-[5.333vw] pb-[50px] pt-6 sm:px-6"
            }
          >
            <VoteCardList masonry>
              {cardsToShow.length === 0 ? (
                <VoteCardMasonryTile fullWidth>
                <EmptyStatePanel>
                  <p className="text-sm text-gray-600">
                    {tagFromUrl ? `#${tagFromUrl} の投稿はありません` : "タグを選ぶか検索してください"}
                  </p>
                </EmptyStatePanel>
                </VoteCardMasonryTile>
              ) : (
                voteCardViewModels.map(({ card, cardId, act, bgUrl }) => {
                  return (
                    <VoteCardMasonryTile key={cardId}>
                    <VoteCard
                      {...buildVoteCardProps({
                        card,
                        cardId,
                        activity: act,
                        currentUser,
                        surface: "participate",
                        backgroundImageUrl: bgUrl,
                        bookmarked: isCardBookmarked(cardId),
                        hasCommented: commentedCardIdSet.has(cardId),
                        onVote: handleVote,
                        onMoreClick: handleTagFilterCardMoreClick,
                      })}
                    />
                    </VoteCardMasonryTile>
                  );
                })
              )}
              <VoteCardMasonryTile fullWidth>
              <RecommendedTags tags={tagFilterRecommendedTags} />
              </VoteCardMasonryTile>
              {randomCollectionForTimeline ? (
                <VoteCardMasonryTile fullWidth>
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
                </VoteCardMasonryTile>
              ) : null}
            </VoteCardList>
          </main>
        </>
      )}

      {/* 虫眼鏡タップで開いたとき：新しい検索画面（注目タグ / お気に入りタグ） */}
      {!isTagFilterView && (
        <>
          {/* タブ：注目タグ / お気に入りタグ */}
          {!isSearching && (
            <>
              <UnderlineTabBar
                items={searchTabItems}
                activeId={activeTab}
                onSelect={selectSearchTab}
                ariaLabel="検索タブ"
                layout="equal"
                transition={false}
              />
              <div className="h-px bg-[#E5E7EB]" aria-hidden />
            </>
          )}

          <main
            className={
              isOverlay
                ? "home-feed-main mx-auto flex-1 bg-white pb-[env(safe-area-inset-bottom,0px)] sm:px-6"
                : "home-feed-main mx-auto bg-white pb-[50px] sm:px-6"
            }
          >
        {!isSearching ? (
          <>
            <section
              className={`border-b border-gray-200 pt-2.5${activeTab === "trending" ? "" : " hidden"}`}
              aria-hidden={activeTab !== "trending"}
            >
              <div className="px-[5.333vw]">
                {displayedTrendingTags.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">検索候補がありません。</p>
                ) : (
                  <>
                    {displayedTrendingTags.slice(0, trendingTagsVisibleCount).map((t) => (
                      <TagListRow
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

            <section
              className={`border-b border-gray-200 pt-2.5${activeTab === "favorite" ? "" : " hidden"}`}
              aria-hidden={activeTab !== "favorite"}
            >
              <div className="px-[5.333vw]">
                {!isLoggedIn ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-gray-700">
                      LINEでログインするとお気に入りタグを保存できるよ
                    </p>
                    <Link
                      href="/profile/login?returnTo=/search"
                      className="mt-6 block w-full max-w-md rounded-[10px] bg-[#FFE100] py-4 text-center text-base font-bold text-gray-900 hover:opacity-90"
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
                      <TagListRow
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
                        <TagListRow
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
                <VoteCardList className="px-[5.333vw] py-4 sm:px-6" masonry>
                  {matchedVoteCardsFull.length === 0 ? (
                    <VoteCardMasonryTile fullWidth>
                    <p className="py-6 text-center text-sm text-gray-500">一致するVOTEはありません。</p>
                    </VoteCardMasonryTile>
                  ) : (
                    <>
                      {matchedVoteCards.map((card) => {
                        const cardId = resolveStableVoteCardId(card);
                        const act = activity[cardId];
                        return (
                          <VoteCardMasonryTile key={cardId}>
                            <VoteCard
                              {...buildVoteCardProps({
                                card,
                                cardId,
                                activity: act,
                                currentUser,
                                surface: "participate",
                                backgroundImageUrl: resolveCardBackgroundUrl(card, cardId),
                                bookmarked: isCardBookmarked(cardId),
                                hasCommented: commentedCardIdSet.has(cardId),
                                onVote: handleVote,
                                onMoreClick: handleTagFilterCardMoreClick,
                              })}
                            />
                          </VoteCardMasonryTile>
                        );
                      })}
                      {matchedVoteCardsFull.length > voteSearchVisibleCount ? (
                        <VoteCardMasonryTile fullWidth>
                        <div ref={voteSearchLoadSentinelRef} className="h-8 w-full shrink-0" aria-hidden />
                        </VoteCardMasonryTile>
                      ) : null}
                    </>
                  )}
                </VoteCardList>
              </section>
            )}
          </>
        )}
          </main>

        </>
      )}

      <CardModerationModals
        cardOptionsCardId={moderation.cardOptionsCardId}
        cardOptionsIsOwnCard={moderation.cardOptionsIsOwnCard}
        reportCardId={moderation.reportCardId}
        addToCommunityCardId={moderation.addToCommunityCardId}
        isLoggedIn={isLoggedIn}
        onCloseOptions={moderation.closeCardOptions}
        onAddToCommunity={moderation.openAddToCommunity}
        onCloseAddToCommunity={moderation.closeAddToCommunity}
        onCollectionsUpdated={refreshCollections}
        onHideCard={(cardId) => {
          const card = allCardsForTagFilter.find((c) => resolveStableVoteCardId(c) === cardId);
          if (card?.createdByUserId) addHiddenUser(card.createdByUserId);
          addHiddenCard(cardId);
          setHiddenUserIds(getHiddenUserIds());
          setHiddenCardIds(getHiddenCardIds());
          moderation.closeCardOptions();
        }}
        onReportCard={moderation.openReport}
        onCloseReport={moderation.closeReport}
      />


      {tagMenu != null && (
        <TagMenuModal
          tag={tagMenu.tag}
          variant={tagMenu.variant}
          onClose={() => setTagMenu(null)}
          onHiddenTagsUpdated={() => setHiddenTagsVersion((v) => v + 1)}
          onFavoriteTagsUpdated={refreshFavoriteTags}
        />
      )}
    </div>
  );
}

export default function SearchPanel(props: SearchPanelProps) {
  return <SearchPanelInner {...props} />;
}

export function SearchPanelWithSuspense(props: SearchPanelProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-white text-sm text-gray-500">
          読み込み中…
        </div>
      }
    >
      <SearchPanelInner {...props} />
    </Suspense>
  );
}
