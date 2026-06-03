"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import VoteCard from "../../components/VoteCard";
import { VoteCardList } from "../../components/VoteCardList";
import CardModerationModals from "../../components/CardModerationModals";
import ShowVotedFilterBar from "../../components/ShowVotedFilterBar";
import BookmarkCollectionModal from "../../components/BookmarkCollectionModal";
import MemberCollectionShareSheet from "../../components/MemberCollectionShareSheet";
import MemberParticipantAvatar from "../../components/MemberParticipantAvatar";
import AppHeader from "../../components/AppHeader";
import type { NewestOldestSortOrder } from "../../components/NewestOldestSortDropdown";
import {
  addParticipatedMemberCollectionIfNeeded,
  getCollectionById,
  getCollections,
  getCollectionsUpdatedEventName,
  getPinnedCollectionIds,
  mergeMemberCollectionForDisplay,
  PINNED_UPDATED_EVENT,
  isOtherUsersCollection,
  syncJoinedMemberCollectionCardIdsFromCanonical,
  syncCollectionToApiAndWait,
  togglePinnedCollection,
  type Collection,
  type CollectionVisibility,
} from "../../data/collections";
import { isCardBookmarked } from "../../data/bookmarks";
import { getCollectionGradientClass } from "../../data/search";
import { voteCardsData, resolveStableVoteCardId } from "../../data/voteCards";
import { getCurrentActivityUserId } from "../../data/auth";
import {
  addCollectionScopedVote,
  COLLECTION_SCOPED_VOTES_UPDATED_EVENT,
  fetchMemberCollectionVotesRemote,
  getAllCollectionScopedActivity,
  getCollectionScopedParticipants,
  hydrateCollectionScopedFromSnapshot,
  MEMBER_COLLECTION_LEFT_EVENT,
  pruneLocalParticipant,
  parseMemberCollectionVotesPayload,
  type CollectionScopedParticipant,
} from "../../data/collectionVoteActivity";
import {
  getHiddenUserIds,
  addHiddenUser,
  getHiddenUsersUpdatedEventName,
} from "../../data/hiddenUsers";
import {
  getHiddenCardIds,
  addHiddenCard,
  getHiddenCardsUpdatedEventName,
} from "../../data/hiddenCards";
import { useShowVotedPreference } from "../../hooks/useShowVotedPreference";
import { useAuthState } from "../../hooks/useAuthState";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useCardModerationFlow } from "../../hooks/useCardModerationFlow";
import { resolveCardBackgroundUrl } from "../../lib/resolveCardBackgroundUrl";
import {
  getMergedCounts,
  isCommentAuthoredByCurrentUser,
  type CardActivity,
} from "../../data/voteCardActivity";
import { useSharedData } from "../../context/SharedDataContext";
import { useEnsureCollectionsHydrated } from "../../hooks/useEnsureCollectionsHydrated";
import type { VoteCardData } from "../../data/voteCards";
import { getCreatedVotesForTimeline } from "../../data/createdVotes";
import { isVotingAllowedNow, resolveCardForVotePeriod } from "../../data/votePeriod";
import type { CollectionGradient } from "../../data/search";
import { pickStoredIconUrl } from "../../data/memberParticipantAvatar";
import { perfMeasure } from "../../lib/perf";
import { normalizeCardIdKey } from "../../lib/normalize";
import { navigateBack } from "../../lib/navigateBack";
import { buildVoteCardProps } from "../../lib/buildVoteCardProps";

const VISIBILITY_LABEL: Record<CollectionVisibility, string> = {
  public: "公開",
  private: "非公開",
  member: "メンバー限定",
};

function scopedActivityForCard(
  map: Record<string, CardActivity>,
  cardId: string
): CardActivity | undefined {
  const nid = normalizeCardIdKey(cardId);
  return map[nid] ?? map[cardId];
}

function MemberCollectionLoginGate({ collectionId }: { collectionId: string }) {
  const returnTo = `/collection/${collectionId}`;
  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[50px]">
      <AppHeader type="title" title="コレクション" backHref="/search" />
      <main className="mx-auto max-w-lg px-6 py-12 text-center">
        <p className="text-base font-bold text-[#191919]">ログインが必要です。</p>
        <p className="mt-3 text-sm leading-relaxed text-[#787878]">
          メンバー限定コレクションを表示するにはログインしてください。
        </p>
        <Link
          href={`/profile/login?returnTo=${encodeURIComponent(returnTo)}`}
          className="mt-10 block w-full max-w-sm mx-auto rounded-xl bg-[#FFE100] py-4 text-center text-base font-bold text-gray-900 hover:opacity-90"
        >
          ログインする
        </Link>
      </main>
    </div>
  );
}

/** 投票参加者に加え、作成者を先頭に表示（KV の参加者は投票した人のみのため） */
function buildMemberParticipantsForDisplay(
  participants: CollectionScopedParticipant[],
  collection: {
    createdByUserId?: string;
    createdByDisplayName?: string;
    createdByIconUrl?: string;
  },
  cards: { card: VoteCardData; cardId: string }[],
  viewerAsOwner: { name: string; iconUrl?: string } | null
): CollectionScopedParticipant[] {
  const oid = collection.createdByUserId;
  // 旧データ等で createdByUserId が無い場合でも、表示名/アイコンがあれば先頭に出す
  if (!oid) {
    const sorted = [...participants].sort((a, b) => (b.lastVotedAt || "").localeCompare(a.lastVotedAt || ""));
    const displayName = collection.createdByDisplayName?.trim() || viewerAsOwner?.name;
    const displayIcon = pickStoredIconUrl(collection.createdByIconUrl || viewerAsOwner?.iconUrl);
    if (displayName || displayIcon) {
      return [
        {
          userId: "__owner__",
          name: displayName?.trim() || "作成",
          iconUrl: displayIcon,
          lastVotedAt: "",
        },
        ...sorted,
      ];
    }
    return sorted;
  }

  let fromCard: { name?: string; iconUrl?: string } | undefined;
  for (const { card } of cards) {
    if (card.createdByUserId === oid && card.creator?.name) {
      fromCard = { name: card.creator.name, iconUrl: card.creator.iconUrl };
      break;
    }
  }
  const displayName =
    collection.createdByDisplayName?.trim() ||
    viewerAsOwner?.name ||
    fromCard?.name ||
    "作成者";
  const displayIcon = pickStoredIconUrl(
    collection.createdByIconUrl || viewerAsOwner?.iconUrl || fromCard?.iconUrl
  );

  const others = participants.filter((p) => p.userId !== oid);
  const existing = participants.find((p) => p.userId === oid);
  const creatorRow: CollectionScopedParticipant = {
    userId: oid,
    name:
      existing && existing.name.trim() && existing.name !== "ゲスト"
        ? existing.name
        : displayName,
    iconUrl: pickStoredIconUrl(existing?.iconUrl) ?? displayIcon,
    lastVotedAt: existing?.lastVotedAt ?? "",
  };
  const sortedOthers = [...others].sort((a, b) =>
    (b.lastVotedAt || "").localeCompare(a.lastVotedAt || "")
  );
  return [creatorRow, ...sortedOthers];
}

function getCardByStableId(id: string, createdVotesForTimeline: VoteCardData[]): VoteCardData | null {
  if (id.startsWith("seed-")) {
    const index = parseInt(id.slice(5), 10);
    if (Number.isNaN(index) || index < 0 || index >= voteCardsData.length) return null;
    return { ...voteCardsData[index], id: `seed-${index}` };
  }
  if (id.startsWith("created-")) {
    return createdVotesForTimeline.find((c) => c.id === id) ?? null;
  }
  const index = parseInt(id, 10);
  if (!Number.isNaN(index) && index >= 0 && index < voteCardsData.length) {
    return { ...voteCardsData[index], id: `seed-${index}` };
  }
  return null;
}

export default function CollectionPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const shared = useSharedData();
  const { createdVotesForTimeline, activity, addVote: sharedAddVote, isRemote } = shared;
  useEnsureCollectionsHydrated();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const { showVoted, handleShowVotedChange } = useShowVotedPreference();
  const moderation = useCardModerationFlow();
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>(() => getHiddenUserIds());
  const [hiddenCardIds, setHiddenCardIds] = useState<string[]>(() => getHiddenCardIds());
  const hiddenCardIdSet = useMemo(() => new Set(hiddenCardIds), [hiddenCardIds]);
  const hiddenUserIdSet = useMemo(() => new Set(hiddenUserIds), [hiddenUserIds]);
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [sharePreparing, setSharePreparing] = useState(false);
  const [cardSortOrder, setCardSortOrder] = useState<NewestOldestSortOrder>("newest");
  const [scopedVotesVersion, setScopedVotesVersion] = useState(0);
  const auth = useAuthState();
  /** コレクションAPIの userId クエリ用（ログイン切替で再取得） */
  const activityUserId = useMemo(
    () => getCurrentActivityUserId(),
    [auth.isLoggedIn, auth.user?.name, auth.userId]
  );
  const skipNextMemberPullRef = useRef(false);
  const currentUser = useCurrentUser(auth);
  useEffect(() => {
    setCollections(getCollections());
    setPinnedIds(getPinnedCollectionIds());
    setShareSheetOpen(false);
    setCardSortOrder("newest");
  }, [id]);
  useEffect(() => {
    const onHiddenUsers = () => setHiddenUserIds(getHiddenUserIds());
    window.addEventListener(getHiddenUsersUpdatedEventName(), onHiddenUsers);
    return () => window.removeEventListener(getHiddenUsersUpdatedEventName(), onHiddenUsers);
  }, []);
  useEffect(() => {
    const onHiddenCards = () => setHiddenCardIds(getHiddenCardIds());
    window.addEventListener(getHiddenCardsUpdatedEventName(), onHiddenCards);
    return () => window.removeEventListener(getHiddenCardsUpdatedEventName(), onHiddenCards);
  }, []);
  useEffect(() => {
    const handler = () => {
      setCollections(getCollections());
      setPinnedIds(getPinnedCollectionIds());
    };
    const eventName = getCollectionsUpdatedEventName();
    window.addEventListener(eventName, handler);
    window.addEventListener(PINNED_UPDATED_EVENT, handler);
    return () => {
      window.removeEventListener(eventName, handler);
      window.removeEventListener(PINNED_UPDATED_EVENT, handler);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    const onScoped = (ev: Event) => {
      const cid = (ev as CustomEvent<{ collectionId?: string }>).detail?.collectionId;
      if (cid === id) setScopedVotesVersion((v) => v + 1);
    };
    window.addEventListener(COLLECTION_SCOPED_VOTES_UPDATED_EVENT, onScoped as EventListener);
    return () => window.removeEventListener(COLLECTION_SCOPED_VOTES_UPDATED_EVENT, onScoped as EventListener);
  }, [id]);

  const localCollection = useMemo(() => getCollectionById(id), [id, collections]);
  const [collectionFromApi, setCollectionFromApi] = useState<Collection | null>(null);
  const [apiFetchStatus, setApiFetchStatus] = useState<"idle" | "loading" | "ok" | "404" | "503" | "error">(
    "idle"
  );
  /** メンバー限定を共有URLで開いたが未ログイン（本文は出さずログイン導線） */
  const [memberShareNeedsLogin, setMemberShareNeedsLogin] = useState(false);
  /** API 取得が続くときだけ表示（一瞬で終わるときは出さない） */
  const [showPatientLoadHint, setShowPatientLoadHint] = useState(false);

  /** メンバー限定は参加者ローカルと本体 KV で cardIds がずれうるため、常に本体を GET する */
  const needsCanonicalCollectionFetch =
    Boolean(id) &&
    (!localCollection ||
      localCollection.visibility === "member" ||
      Boolean(localCollection.joinedParticipation));

  useLayoutEffect(() => {
    if (!needsCanonicalCollectionFetch) {
      setCollectionFromApi(null);
      setApiFetchStatus("idle");
      setMemberShareNeedsLogin(false);
      return;
    }
    let cancelled = false;
    setApiFetchStatus("loading");
    setMemberShareNeedsLogin(false);
    fetch(
      `/api/collection/${encodeURIComponent(id)}?userId=${encodeURIComponent(activityUserId)}`
    )
      .then((res) => {
        if (cancelled) return;
        if (res.status === 503) {
          setApiFetchStatus("503");
          setMemberShareNeedsLogin(false);
          return;
        }
        if (!res.ok) {
          setApiFetchStatus("404");
          setMemberShareNeedsLogin(false);
          return;
        }
        setApiFetchStatus("ok");
        return res.json();
      })
      .then(
        (data: {
          id?: string;
          name?: string;
          color?: string;
          gradient?: string;
          visibility?: string;
          cardIds?: string[];
          memberVotes?: unknown;
          createdByDisplayName?: string;
          createdByIconUrl?: string;
        }) => {
          if (cancelled || !data?.id) return;
          const grad = data.gradient as string | undefined;
          const validGradients: CollectionGradient[] = [
            "blue-cyan",
            "pink-purple",
            "purple-pink",
            "orange-yellow",
            "green-yellow",
            "cyan-aqua",
          ];
          const gradient =
            grad && validGradients.includes(grad as CollectionGradient) ? (grad as CollectionGradient) : undefined;
          const visibility = (data.visibility as CollectionVisibility) ?? "public";
          if (visibility === "member" && !auth.isLoggedIn) {
            if (!cancelled) {
              setMemberShareNeedsLogin(true);
              setCollectionFromApi(null);
            }
            return;
          }
          if (!cancelled) setMemberShareNeedsLogin(false);
          if (visibility === "member" && data.memberVotes != null) {
            const snap = parseMemberCollectionVotesPayload(data.memberVotes);
            if (snap) {
              hydrateCollectionScopedFromSnapshot(data.id, snap);
              skipNextMemberPullRef.current = true;
              // localStorage 更新だけでは useMemo が再実行されない場合があるため明示更新
              setScopedVotesVersion((v) => v + 1);
            }
          }
          const canonicalCardIds = Array.isArray(data.cardIds) ? data.cardIds : [];
          const fromApi: Collection = {
            id: data.id,
            name: String(data.name ?? ""),
            color: String(data.color ?? "#E5E7EB"),
            gradient,
            visibility,
            cardIds: canonicalCardIds,
            createdByUserId:
              typeof (data as { createdByUserId?: string }).createdByUserId === "string"
                ? (data as { createdByUserId: string }).createdByUserId
                : undefined,
            createdByDisplayName:
              typeof data.createdByDisplayName === "string" && data.createdByDisplayName.trim()
                ? data.createdByDisplayName.trim()
                : undefined,
            createdByIconUrl:
              typeof data.createdByIconUrl === "string" && data.createdByIconUrl.length > 0
                ? data.createdByIconUrl
                : undefined,
          };
          if (visibility === "member") {
            syncJoinedMemberCollectionCardIdsFromCanonical(data.id, canonicalCardIds);
          }
          setCollectionFromApi((prev) => {
            if (
              prev &&
              prev.id === fromApi.id &&
              prev.name === fromApi.name &&
              prev.color === fromApi.color &&
              prev.gradient === fromApi.gradient &&
              prev.visibility === fromApi.visibility &&
              prev.createdByUserId === fromApi.createdByUserId &&
              prev.createdByDisplayName === fromApi.createdByDisplayName &&
              prev.createdByIconUrl === fromApi.createdByIconUrl &&
              prev.cardIds.length === fromApi.cardIds.length &&
              prev.cardIds.every((cid, i) => cid === fromApi.cardIds[i])
            ) {
              return prev;
            }
            return fromApi;
          });
        }
      )
      .catch(() => {
        if (!cancelled) {
          setApiFetchStatus("error");
          setMemberShareNeedsLogin(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, needsCanonicalCollectionFetch, activityUserId, auth.isLoggedIn]);

  const collection = useMemo(
    () => mergeMemberCollectionForDisplay(localCollection, collectionFromApi),
    [localCollection, collectionFromApi]
  );
  const isFromApi = !!collectionFromApi && !localCollection;
  const isMemberCollection = collection?.visibility === "member";
  const isMemberCollectionParticipant =
    isMemberCollection && Boolean(collection?.joinedParticipation);

  const isWaitingCollectionFetch =
    Boolean(id) &&
    !localCollection &&
    !collectionFromApi &&
    apiFetchStatus === "loading" &&
    !memberShareNeedsLogin;

  useEffect(() => {
    if (!isWaitingCollectionFetch) {
      setShowPatientLoadHint(false);
      return;
    }
    const t = window.setTimeout(() => setShowPatientLoadHint(true), 550);
    return () => {
      clearTimeout(t);
      setShowPatientLoadHint(false);
    };
  }, [isWaitingCollectionFetch]);

  /** メンバー限定: 初回は paint 前に GET を開始（体感遅延を抑える） */
  useLayoutEffect(() => {
    if (!collection?.id || collection.visibility !== "member") return;
    const colId = collection.id;
    let cancelled = false;
    // focus/interval 等で多重に叩かない
    let inFlight = false;
    let lastPullAt = 0;
    const pullOnce = async () => {
      const now = Date.now();
      if (inFlight) return;
      // 直近で叩いた直後（同一フレームでの重複など）を避ける
      if (now - lastPullAt < 800) return;
      inFlight = true;
      lastPullAt = now;
      const r = await fetchMemberCollectionVotesRemote(colId);
      inFlight = false;
      if (cancelled) return;
      if (r.ok) {
        hydrateCollectionScopedFromSnapshot(colId, r.snapshot);
        setScopedVotesVersion((v) => v + 1);
      }
    };
    if (skipNextMemberPullRef.current) {
      skipNextMemberPullRef.current = false;
    } else {
      void pullOnce();
    }
    return () => {
      cancelled = true;
    };
  }, [collection?.id, collection?.visibility, activityUserId]);

  /** メンバー限定コレの投票・参加者をサーバーから追う間隔（非表示タブではポーリング停止） */
  const MEMBER_COLLECTION_POLL_MS = 30_000;

  /**
   * メンバー限定: 定期・フォーカス・タブ復帰で再取得。
   * 他端末の参加・投票は CustomEvent で届かないため GET で追う。非表示中は interval を止める。
   */
  useEffect(() => {
    if (!collection?.id || collection.visibility !== "member") return;
    const colId = collection.id;
    let inFlight = false;
    let lastPullAt = 0;
    let intervalId: number | null = null;
    const applyRemote = (r: Awaited<ReturnType<typeof fetchMemberCollectionVotesRemote>>) => {
      if (r.ok) {
        hydrateCollectionScopedFromSnapshot(colId, r.snapshot);
        setScopedVotesVersion((v) => v + 1);
      }
    };
    const pullThrottled = async () => {
      const now = Date.now();
      if (inFlight) return;
      if (now - lastPullAt < 800) return;
      inFlight = true;
      lastPullAt = now;
      const r = await fetchMemberCollectionVotesRemote(colId);
      inFlight = false;
      applyRemote(r);
    };
    /** タブ復帰・ウィンドウフォーカス時はスロットルを外し、すぐ他メンバーのアイコン反映を試みる */
    const pullImmediate = async () => {
      if (inFlight) return;
      inFlight = true;
      lastPullAt = Date.now();
      const r = await fetchMemberCollectionVotesRemote(colId);
      inFlight = false;
      applyRemote(r);
    };
    const stopPolling = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };
    const startPolling = () => {
      if (document.visibilityState !== "visible") return;
      stopPolling();
      intervalId = window.setInterval(() => void pullThrottled(), MEMBER_COLLECTION_POLL_MS);
    };
    startPolling();
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      void pullImmediate();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void pullImmediate();
        startPolling();
      } else {
        stopPolling();
      }
    };
    const onLeft = (ev: Event) => {
      const detail = (ev as CustomEvent<{ collectionId?: string; userId?: string }>).detail;
      if (detail?.collectionId !== colId) return;
      if (detail.userId) pruneLocalParticipant(colId, detail.userId);
      setScopedVotesVersion((v) => v + 1);
      void pullImmediate();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(MEMBER_COLLECTION_LEFT_EVENT, onLeft as EventListener);
    return () => {
      stopPolling();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(MEMBER_COLLECTION_LEFT_EVENT, onLeft as EventListener);
    };
  }, [collection?.id, collection?.visibility, activityUserId]);

  const scopedActivityMap = useMemo(() => {
    if (!collection || !isMemberCollection) return {} as Record<string, CardActivity>;
    return getAllCollectionScopedActivity(collection.id);
  }, [collection?.id, isMemberCollection, scopedVotesVersion, activityUserId]);
  const memberParticipants = useMemo(() => {
    if (!collection || !isMemberCollection) return [];
    return getCollectionScopedParticipants(collection.id);
  }, [collection?.id, isMemberCollection, scopedVotesVersion]);

  const viewerAsOwnerProfile = useMemo(() => {
    if (!collection) return null;
    // 旧データで createdByUserId が無い場合でも、オーナー作成（joinedParticipation ではない）なら自分として扱う
    const isOwner =
      (collection.createdByUserId && collection.createdByUserId === activityUserId) ||
      (!collection.joinedParticipation && collection.visibility === "member");
    if (!isOwner) return null;
    if (!auth.isLoggedIn || !auth.user?.name?.trim()) return null;
    return { name: auth.user.name.trim(), iconUrl: auth.user.iconUrl };
  }, [collection, activityUserId, auth.isLoggedIn, auth.user?.name, auth.user?.iconUrl]);

  const isPinned = pinnedIds.includes(id);

  const cardsInCollection = useMemo(() => {
    if (!collection) return [];
    return collection.cardIds
      .map((rawCardId) => {
        const cardId = normalizeCardIdKey(rawCardId);
        const card = getCardByStableId(cardId, createdVotesForTimeline);
        return card ? { card, cardId } : null;
      })
      .filter((x): x is { card: VoteCardData; cardId: string } => x != null)
      .filter(({ card, cardId }) => {
        const stableId = resolveStableVoteCardId(card);
        if (hiddenCardIdSet.has(cardId) || hiddenCardIdSet.has(stableId)) return false;
        if (card.createdByUserId && hiddenUserIdSet.has(card.createdByUserId)) return false;
        return true;
      });
  }, [collection, createdVotesForTimeline, hiddenCardIdSet, hiddenUserIdSet]);

  const sortedCardsInCollection = useMemo(() => {
    const list = [...cardsInCollection];
    list.sort((a, b) => {
      const ta = a.card.createdAt ?? "0";
      const tb = b.card.createdAt ?? "0";
      if (cardSortOrder === "newest") return tb.localeCompare(ta);
      return ta.localeCompare(tb);
    });
    return list;
  }, [cardsInCollection, cardSortOrder]);

  /** コレ内カードだけ見る（全 activity を走査しない） */
  const commentedCardIdSet = useMemo(() => {
    const set = new Set<string>();
    const opts = {
      isLoggedIn: auth.isLoggedIn,
      displayName: auth.user?.name,
    };
    for (const { cardId } of cardsInCollection) {
      const a = activity[cardId];
      const list = Array.isArray(a?.comments) ? a.comments : [];
      const filtered = isMemberCollection
        ? list.filter((c) => (c as { collectionId?: unknown }).collectionId === collection?.id)
        : list.filter((c) => (c as { collectionId?: unknown }).collectionId == null);
      if (filtered.some((c) => isCommentAuthoredByCurrentUser(c.user?.name, opts))) {
        set.add(cardId);
      }
    }
    return set;
  }, [activity, auth.isLoggedIn, auth.user?.name, cardsInCollection, isMemberCollection, collection?.id]);

  /** コレ内の VOTE に1票でも入れた参加者（作成者は先頭・「作成」バッジ） */
  const memberParticipantsForDisplay = useMemo(() => {
    if (!collection || collection.visibility !== "member") return [];
    return buildMemberParticipantsForDisplay(
      memberParticipants,
      collection,
      cardsInCollection,
      viewerAsOwnerProfile
    );
  }, [collection, memberParticipants, cardsInCollection, viewerAsOwnerProfile]);

  const cardsToShow = useMemo(() => {
    if (showVoted) return sortedCardsInCollection;
    if (isMemberCollection) {
      return sortedCardsInCollection.filter(
        ({ cardId }) => scopedActivityForCard(scopedActivityMap, cardId)?.userSelectedOption == null
      );
    }
    return sortedCardsInCollection.filter(({ cardId }) => !activity[cardId]?.userSelectedOption);
  }, [sortedCardsInCollection, showVoted, activity, isMemberCollection, scopedActivityMap]);

  const voteCardViewModels = useMemo(() => {
    return perfMeasure("collection.voteCardViewModels", () => {
      return cardsToShow.map(({ card, cardId }) => {
        const act = activity[cardId];
        const scopedAct = scopedActivityForCard(scopedActivityMap, cardId);
        const globalComments = Array.isArray(act?.comments) ? act.comments : [];
        const comments = isMemberCollection
          ? []
          : globalComments.filter((c) => (c as { collectionId?: unknown }).collectionId == null);
        const voteActivity: CardActivity = isMemberCollection
          ? {
              countA: scopedAct?.countA ?? 0,
              countB: scopedAct?.countB ?? 0,
              comments: [],
              userSelectedOption: scopedAct?.userSelectedOption,
              userVotedAt: scopedAct?.userVotedAt,
            }
          : { ...(act ?? { countA: 0, countB: 0, comments: [] }), comments };
        return {
          card,
          cardId,
          voteActivity,
          initialSelectedOption: isMemberCollection
            ? (scopedAct?.userSelectedOption ?? null)
            : (act?.userSelectedOption ?? null),
          backgroundImageUrl: resolveCardBackgroundUrl(card, cardId),
        };
      });
    });
  }, [cardsToShow, activity, scopedActivityMap, isMemberCollection, collection?.id]);

  const handleCollectionVote = useCallback(
    (cid: string, option: "A" | "B") => {
      const entry = cardsInCollection.find((x) => x.cardId === cid);
      const fromCol = entry?.card;
      const timeline = isRemote ? createdVotesForTimeline : getCreatedVotesForTimeline();
      const meta = fromCol ?? resolveCardForVotePeriod(cid, timeline);
      if (meta && !isVotingAllowedNow(meta.periodStart, meta.periodEnd)) return;
      if (collection?.visibility === "member") {
        addCollectionScopedVote(collection.id, cid, option, { useKv: true });
        addParticipatedMemberCollectionIfNeeded(collection);
        const bump = () => setScopedVotesVersion((v) => v + 1);
        if (showVoted) bump();
        else flushSync(bump);
        return;
      }
      void sharedAddVote(cid, option);
    },
    [collection, sharedAddVote, cardsInCollection, isRemote, createdVotesForTimeline, showVoted]
  );

  const handleCollectionCardMoreClick = useCallback(
    (cardId: string) => {
      const found = cardsInCollection.find((x) => x.cardId === cardId);
      moderation.openCardOptions(cardId, found?.card.createdByUserId === getCurrentActivityUserId());
    },
    [cardsInCollection, moderation]
  );

  const handleTogglePin = () => {
    togglePinnedCollection(id);
    setPinnedIds(getPinnedCollectionIds());
  };

  const handleOpenShareSheet = useCallback(async () => {
    if (!collection || collection.visibility !== "member" || sharePreparing) return;
    setSharePreparing(true);
    const ok = await syncCollectionToApiAndWait(collection);
    setSharePreparing(false);
    if (ok) setShareSheetOpen(true);
  }, [collection, sharePreparing]);

  /** オーナー表示中に KV へ先に載せ、共有リンクが空振りしないようにする */
  useEffect(() => {
    if (!localCollection || localCollection.visibility !== "member" || localCollection.joinedParticipation) {
      return;
    }
    void syncCollectionToApiAndWait(localCollection, { quiet: true });
  }, [localCollection?.id, localCollection?.visibility, localCollection?.joinedParticipation]);

  if (!collection) {
    if (memberShareNeedsLogin && id) {
      return <MemberCollectionLoginGate collectionId={id} />;
    }
    if (!localCollection && id && apiFetchStatus === "loading") {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F1F1F1] px-6 text-center">
          <p className="text-sm font-medium text-gray-700">読み込み中…</p>
          {showPatientLoadHint ? (
            <p className="max-w-[17rem] text-sm leading-relaxed text-gray-600">
              メンバー限定コレクションは、表示に少し時間がかかることがあります。
              <br />
              <span className="font-medium text-gray-800">ちょっと待ってね🙏</span>
            </p>
          ) : null}
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F1F1]">
        <div className="px-6 text-center">
          <p className="text-gray-600">
            {apiFetchStatus === "503"
              ? "共有リンクを開くにはサーバー（KV）の設定が必要です。"
              : "このコレクションは見つかりませんでした。リンクが古いか、まだ共有されていない可能性があります。"}
          </p>
          <Link href="/search" className="mt-4 inline-block text-blue-600 underline">
            検索へ
          </Link>
          <Link href="/profile" className="mt-4 ml-4 inline-block text-blue-600 underline">
            マイページへ
          </Link>
        </div>
      </div>
    );
  }

  if (collection.visibility === "member" && !auth.isLoggedIn) {
    return <MemberCollectionLoginGate collectionId={id} />;
  }

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[50px]">
      {/* ヘッダー：設定グラデーション/カラー背景・コレクション名・戻る・ピン（全画面共通） */}
      <header
        className={`flex items-center justify-between px-4 py-3 ${collection.gradient ? `bg-gradient-to-r ${getCollectionGradientClass(collection.gradient)}` : ""}`}
        style={collection.gradient ? undefined : { backgroundColor: collection.color }}
      >
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-gray-900"
          aria-label="1つ前のページに戻る"
          onClick={() =>
            navigateBack(router, {
              fallbackHref: isFromApi || isOtherUsersCollection(id) ? "/search" : "/profile",
            })
          }
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
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

      <main
        className={`mx-auto max-w-lg px-[5.333vw] pb-6 ${
          collection.visibility === "member" ? "pt-[2.6px]" : "pt-4"
        }`}
      >
        {/* 登録数・公開設定（メンバー限定時は右端にシェア）。ヘッダー直下は main の pt を詰める */}
        {collection.visibility === "member" ? (
          <div className="flex flex-col gap-2 pb-0 pt-[2.4375px]">
            <div className="flex w-full items-center justify-between gap-2">
              <p className="min-w-0 text-[13px] font-normal leading-snug text-gray-600">
                登録数 {collection.cardIds.length}件 · {VISIBILITY_LABEL.member}
              </p>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 transition-opacity active:opacity-70"
                aria-label="シェアする"
                onClick={() => void handleOpenShareSheet()}
                disabled={sharePreparing}
                aria-busy={sharePreparing}
              >
                <img src="/icons/icon_share.svg" alt="" className="h-5 w-5" width={20} height={21} />
              </button>
            </div>
            <div className="-mx-[5.333vw] h-px shrink-0 bg-gray-300" aria-hidden />
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-[15px]">
            <p className="text-[13px] font-normal leading-snug text-gray-600">
              登録数 {collection.cardIds.length}件
              {collection.visibility !== "public" && ` · ${VISIBILITY_LABEL[collection.visibility]}`}
            </p>
            <div className="-mx-[5.333vw] h-px shrink-0 bg-gray-300" aria-hidden />
          </div>
        )}
        {/* メンバー参加者アイコン＋名（メンバー限定のみ）。Safari では overflow 内の img が描画されない事例があるため縦スクロールは付けない */}
        {collection.visibility === "member" && (
          <div className="mt-2 pr-0.5">
            {memberParticipantsForDisplay.length === 0 &&
            !collection.createdByUserId &&
            !collection.createdByDisplayName?.trim() ? (
              <p className="text-[11px] leading-tight text-gray-500">参加者を読み込み中…</p>
            ) : memberParticipantsForDisplay.length === 0 ? (
              <p className="text-[11px] leading-tight text-gray-500">まだ参加者はいません</p>
            ) : (
              <ul className="flex flex-wrap gap-x-2.5 gap-y-1.5">
                {memberParticipantsForDisplay.map((p) => (
                  <li key={p.userId} className="flex max-w-[10rem] min-w-0 items-center gap-1.5">
                    <MemberParticipantAvatar
                      userId={p.userId}
                      iconUrl={p.iconUrl}
                      lastVotedAt={p.lastVotedAt}
                    />
                    <span className="min-w-0 truncate text-[11px] leading-tight text-gray-600">{p.name}</span>
                    {(collection.createdByUserId === p.userId || p.userId === "__owner__") && (
                      <span className="shrink-0 rounded bg-gray-200 px-1 py-px text-[9px] font-medium text-gray-600">
                        作成
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {collection.visibility === "member" && (
          <div className="-mx-[5.333vw] mt-2 h-px bg-gray-300" aria-hidden />
        )}

        <ShowVotedFilterBar
          className="relative z-10 mt-3 pb-3"
          sortOrder={cardSortOrder}
          onSortOrderChange={setCardSortOrder}
          showVoted={showVoted}
          onShowVotedChange={handleShowVotedChange}
        />

        {/* カード一覧 */}
        {cardsToShow.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white px-6 py-12 text-center">
            <p className="text-sm text-gray-500">
              {showVoted
                ? "このコレクションにはまだ投稿がありません。"
                : "投票済みの投稿がありません。"}
            </p>
          </div>
        ) : (
          <VoteCardList className="mt-4">
            {voteCardViewModels.map(({ card, cardId, voteActivity, initialSelectedOption, backgroundImageUrl }) => {
              return (
                <VoteCard
                  key={cardId}
                  {...buildVoteCardProps({
                    card,
                    cardId,
                    activity: voteActivity,
                    currentUser,
                    surface: "participate",
                    backgroundImageUrl,
                    bookmarked: isMemberCollectionParticipant ? false : isCardBookmarked(cardId),
                    hasCommented: false,
                    onVote: handleCollectionVote,
                    onBookmarkClick: isMemberCollectionParticipant ? undefined : setModalCardId,
                    onMoreClick: isMemberCollection ? undefined : handleCollectionCardMoreClick,
                    commentsDisabled: isMemberCollection || card.commentsDisabled === true,
                    hideShare: isMemberCollection,
                    hideBookmark: isMemberCollectionParticipant,
                    overrides: {
                      initialSelectedOption,
                      optimisticVoteResult: isMemberCollection || showVoted,
                    },
                  })}
                />
              );
            })}
          </VoteCardList>
        )}
      </main>

      {shareSheetOpen && id && collection.visibility === "member" && (
        <MemberCollectionShareSheet
          open={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          collectionId={id}
        />
      )}

      <CardModerationModals
        cardOptionsCardId={moderation.cardOptionsCardId}
        cardOptionsIsOwnCard={moderation.cardOptionsIsOwnCard}
        reportCardId={moderation.reportCardId}
        onCloseOptions={moderation.closeCardOptions}
        onHideCard={(cardId) => {
          const entry = cardsInCollection.find(({ cardId: cid }) => cid === cardId);
          if (entry?.card.createdByUserId) addHiddenUser(entry.card.createdByUserId);
          addHiddenCard(entry ? resolveStableVoteCardId(entry.card) : cardId);
          setHiddenUserIds(getHiddenUserIds());
          setHiddenCardIds(getHiddenCardIds());
          moderation.closeCardOptions();
        }}
        onReportCard={moderation.openReport}
        onCloseReport={moderation.closeReport}
      />

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
