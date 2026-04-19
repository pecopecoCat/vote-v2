"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import VoteCard from "../../components/VoteCard";
import CardOptionsModal from "../../components/CardOptionsModal";
import ReportViolationModal from "../../components/ReportViolationModal";
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
import { voteCardsData, CARD_BACKGROUND_IMAGES } from "../../data/voteCards";
import { getAuth, getAuthUpdatedEventName, getCurrentActivityUserId } from "../../data/auth";
import {
  addCollectionScopedVote,
  COLLECTION_SCOPED_VOTES_UPDATED_EVENT,
  getAllCollectionScopedActivity,
  getCollectionScopedParticipants,
} from "../../data/collectionVoteActivity";
import { addHiddenUser } from "../../data/hiddenUsers";
import { getShowVoted, setShowVoted } from "../../data/showVotedPreference";
import {
  getMergedCounts,
  isCommentAuthoredByCurrentUser,
  type CardActivity,
} from "../../data/voteCardActivity";
import { useSharedData } from "../../context/SharedDataContext";
import type { VoteCardData } from "../../data/voteCards";
import type { CurrentUser } from "../../components/VoteCard";
import type { CollectionGradient } from "../../data/search";

const VISIBILITY_LABEL: Record<CollectionVisibility, string> = {
  public: "公開",
  private: "非公開",
  member: "メンバー限定",
};

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

function backgroundForCard(card: VoteCardData, cardId: string): string {
  if (card.backgroundImageUrl) return card.backgroundImageUrl;
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = ((h << 5) - h + cardId.charCodeAt(i)) | 0;
  return CARD_BACKGROUND_IMAGES[Math.abs(h) % CARD_BACKGROUND_IMAGES.length];
}

export default function CollectionPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const shared = useSharedData();
  const { createdVotesForTimeline, activity, addVote: sharedAddVote } = shared;
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [showVoted, setShowVotedState] = useState(() => getShowVoted());
  const handleShowVotedChange = useCallback((value: boolean) => {
    setShowVoted(value);
    setShowVotedState(value);
  }, []);
  const [cardOptionsCardId, setCardOptionsCardId] = useState<string | null>(null);
  const [cardOptionsIsOwnCard, setCardOptionsIsOwnCard] = useState(false);
  const [reportCardId, setReportCardId] = useState<string | null>(null);
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [scopedVotesVersion, setScopedVotesVersion] = useState(0);
  const [auth, setAuth] = useState(() => getAuth());
  const currentUser = useMemo<CurrentUser>(
    () =>
      auth.isLoggedIn && auth.user
        ? { type: "sns", name: auth.user.name, iconUrl: auth.user.iconUrl }
        : { type: "guest" },
    [auth.isLoggedIn, auth.user]
  );

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
    const handler = () => setAuth(getAuth());
    window.addEventListener(getAuthUpdatedEventName(), handler);
    return () => window.removeEventListener(getAuthUpdatedEventName(), handler);
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
  const [apiFetchFailed, setApiFetchFailed] = useState(false);

  useEffect(() => {
    if (!id || localCollection) {
      setCollectionFromApi(null);
      setApiFetchFailed(false);
      return;
    }
    let cancelled = false;
    setApiFetchFailed(false);
    fetch(`/api/collection/${encodeURIComponent(id)}`)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setApiFetchFailed(true);
          return;
        }
        return res.json();
      })
      .then((data: { id?: string; name?: string; color?: string; gradient?: string; visibility?: string; cardIds?: string[] }) => {
        if (cancelled || !data?.id) return;
        const grad = data.gradient as string | undefined;
        const validGradients: CollectionGradient[] = ["blue-cyan", "pink-purple", "purple-pink", "orange-yellow", "green-yellow", "cyan-aqua"];
        const gradient = grad && validGradients.includes(grad as CollectionGradient) ? (grad as CollectionGradient) : undefined;
        setCollectionFromApi({
          id: data.id,
          name: String(data.name ?? ""),
          color: String(data.color ?? "#E5E7EB"),
          gradient,
          visibility: (data.visibility as CollectionVisibility) ?? "public",
          cardIds: Array.isArray(data.cardIds) ? data.cardIds : [],
        });
      })
      .catch(() => {
        if (!cancelled) setApiFetchFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, localCollection]);

  const collection = localCollection ?? collectionFromApi;
  const isFromApi = !!collectionFromApi && !localCollection;
  const isMemberCollection = collection?.visibility === "member";
  const scopedActivityMap = useMemo(() => {
    if (!collection || !isMemberCollection) return {} as Record<string, CardActivity>;
    return getAllCollectionScopedActivity(collection.id);
  }, [collection, isMemberCollection, scopedVotesVersion, auth.isLoggedIn, auth.user?.name]);
  const memberParticipants = useMemo(() => {
    if (!collection || !isMemberCollection) return [];
    return getCollectionScopedParticipants(collection.id);
  }, [collection, isMemberCollection, scopedVotesVersion, auth.isLoggedIn, auth.user?.name]);
  const isPinned = pinnedIds.includes(id);
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

  const cardsInCollection = useMemo(() => {
    if (!collection) return [];
    return collection.cardIds
      .map((cardId) => {
        const card = getCardByStableId(cardId, createdVotesForTimeline);
        return card ? { card, cardId } : null;
      })
      .filter((x): x is { card: VoteCardData; cardId: string } => x != null);
  }, [collection, createdVotesForTimeline]);

  const cardsToShow = useMemo(() => {
    if (showVoted) return cardsInCollection;
    if (isMemberCollection) {
      return cardsInCollection.filter(({ cardId }) => !scopedActivityMap[cardId]?.userSelectedOption);
    }
    return cardsInCollection.filter(({ cardId }) => !activity[cardId]?.userSelectedOption);
  }, [cardsInCollection, showVoted, activity, isMemberCollection, scopedActivityMap]);

  const handleCollectionVote = useCallback(
    (cid: string, option: "A" | "B") => {
      if (collection?.visibility === "member") {
        addCollectionScopedVote(collection.id, cid, option);
        return;
      }
      void sharedAddVote(cid, option);
    },
    [collection, sharedAddVote]
  );

  const handleCollectionCardMoreClick = useCallback((cardId: string) => {
    setCardOptionsCardId(cardId);
    const found = cardsInCollection.find((x) => x.cardId === cardId);
    setCardOptionsIsOwnCard(found?.card.createdByUserId === getCurrentActivityUserId());
  }, [cardsInCollection]);

  const handleTogglePin = () => {
    togglePinnedCollection(id);
    setPinnedIds(getPinnedCollectionIds());
  };

  const handleShareCollection = useCallback(() => {
    if (typeof window === "undefined" || !id) return;
    const url = `${window.location.origin}/collection/${encodeURIComponent(id)}`;
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=VOTE`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }, [id]);

  if (!collection) {
    if (!apiFetchFailed && !localCollection && id) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F1F1F1]">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F1F1]">
        <div className="px-6 text-center">
          <p className="text-gray-600">コレクションが見つかりませんでした。</p>
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

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[50px]">
      {/* ヘッダー：設定グラデーション/カラー背景・コレクション名・戻る・ピン（全画面共通） */}
      <header
        className={`flex items-center justify-between px-4 py-3 ${collection.gradient ? `bg-gradient-to-r ${getCollectionGradientClass(collection.gradient)}` : ""}`}
        style={collection.gradient ? undefined : { backgroundColor: collection.color }}
      >
        <Link
          href={isFromApi || isOtherUsersCollection(id) ? "/search" : "/profile"}
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
        {/* 登録数・公開設定（メンバー限定時は右端にシェア） */}
        {collection.visibility === "member" ? (
          <div className="flex w-full items-center justify-between gap-2">
            <p className="min-w-0 text-sm text-gray-600">
              登録数 {collection.cardIds.length}件 · {VISIBILITY_LABEL.member}
            </p>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 transition-opacity active:opacity-70"
              aria-label="シェアする"
              onClick={handleShareCollection}
            >
              <img src="/icons/icon_share.svg" alt="" className="h-5 w-5" width={20} height={21} />
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            登録数 {collection.cardIds.length}件
            {collection.visibility !== "public" && ` · ${VISIBILITY_LABEL[collection.visibility]}`}
          </p>
        )}
        {collection.visibility === "member" && memberParticipants.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] font-medium tracking-wide text-gray-400">投票したメンバー</p>
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1.5">
              {memberParticipants.slice(0, 18).map((p) => (
                <li key={p.userId} className="flex max-w-[9rem] min-w-0 items-center gap-1.5">
                  <img
                    src={p.iconUrl ?? "/default-avatar.png"}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]"
                    width={24}
                    height={24}
                  />
                  <span className="truncate text-[11px] leading-tight text-gray-600">{p.name}</span>
                </li>
              ))}
            </ul>
            {memberParticipants.length > 18 && (
              <p className="mt-1 text-[10px] text-gray-400">ほか {memberParticipants.length - 18} 人</p>
            )}
          </div>
        )}
        {collection.visibility === "member" && (
          <p
            className={`text-xs text-gray-500 ${memberParticipants.length > 0 ? "mt-2" : "mt-1"}`}
          >
            リンクを知っている方のみが閲覧・投票できます。この画面の得票数は、このコレクション内の投票だけを集計しています。
          </p>
        )}

        {/* 新着順・投票済みを表示（並び替え UI と同じピル見た目） */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="flex min-h-[36px] min-w-[7.75rem] items-center justify-between gap-2 rounded-full border border-[#DADADA] bg-white py-1.5 pl-3.5 pr-1.5 text-left text-[12px] font-normal leading-none text-[#787878] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <span className="min-w-0 flex-1 text-left tracking-tight">新着順</span>
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-base)]">
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
            onChange={handleShowVotedChange}
            label="投票済みを表示"
          />
        </div>

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
          <div className="mt-4 flex flex-col gap-[5.333vw]">
            {cardsToShow.map(({ card, cardId }) => {
              const act = activity[cardId];
              const scopedAct = scopedActivityMap[cardId];
              const voteActivity: CardActivity = isMemberCollection
                ? {
                    countA: scopedAct?.countA ?? 0,
                    countB: scopedAct?.countB ?? 0,
                    comments: act?.comments ?? [],
                    userSelectedOption: scopedAct?.userSelectedOption,
                    userVotedAt: scopedAct?.userVotedAt,
                  }
                : (act ?? { countA: 0, countB: 0, comments: [] });
              const merged = getMergedCounts(
                isMemberCollection ? 0 : (card.countA ?? 0),
                isMemberCollection ? 0 : (card.countB ?? 0),
                card.commentCount ?? 0,
                voteActivity
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
                  hasCommented={commentedCardIdSet.has(cardId)}
                  initialSelectedOption={
                    isMemberCollection ? (scopedAct?.userSelectedOption ?? null) : (act?.userSelectedOption ?? null)
                  }
                  onVote={handleCollectionVote}
                  onBookmarkClick={setModalCardId}
                  onMoreClick={handleCollectionCardMoreClick}
                  visibility={card.visibility}
                  optionAImageUrl={card.optionAImageUrl}
                  optionBImageUrl={card.optionBImageUrl}
                  periodEnd={card.periodEnd}
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
          isOwnCard={cardOptionsIsOwnCard}
          onClose={() => setCardOptionsCardId(null)}
          onHide={(cardId) => {
            const entry = cardsInCollection.find(({ cardId: cid }) => cid === cardId);
            if (entry?.card.createdByUserId) {
              addHiddenUser(entry.card.createdByUserId);
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
          isLoggedIn={auth.isLoggedIn}
        />
      )}
    </div>
  );
}
