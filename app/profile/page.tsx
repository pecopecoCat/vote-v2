"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
import VoteCard from "../components/VoteCard";
import { getCreatedVotes, deleteCreatedVote, getCreatedVotesUpdatedEventName } from "../data/createdVotes";
import { voteCardsData, CARD_BACKGROUND_IMAGES } from "../data/voteCards";
import { getMergedCounts, type CardActivity, type VoteComment } from "../data/voteCardActivity";
import { useSharedData } from "../context/SharedDataContext";
import { getCurrentActivityUserId } from "../data/auth";
import { getFavoriteTags, getFavoriteTagsUpdatedEventName } from "../data/favoriteTags";
import {
  getCollections,
  getCollectionsUpdatedEventName,
  createCollection,
  updateCollection,
  deleteCollection,
  type Collection,
  type CollectionVisibility,
} from "../data/collections";
import { getBookmarkIds, isCardBookmarked, getBookmarksUpdatedEventName } from "../data/bookmarks";
import { getCollectionGradientStyle } from "../data/search";
import { getAuth, getAuthUpdatedEventName } from "../data/auth";
import type { VoteCardData } from "../data/voteCards";
import type { CurrentUser } from "../components/VoteCard";
import VoteCardMini from "../components/VoteCardMini";
import BookmarkCollectionModal from "../components/BookmarkCollectionModal";
import Button from "../components/Button";
import CollectionSettingsModal from "../components/CollectionSettingsModal";
import CollectionOptionsModal from "../components/CollectionOptionsModal";
import CardOptionsModal from "../components/CardOptionsModal";

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
      <button type="button" className="shrink-0 text-[var(--color-brand-logo)] hover:opacity-80" aria-label="その他" onClick={(e) => e.stopPropagation()}>
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

function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnTo = searchParams.get("returnTo"); // 未ログインでVOTE作成から来た場合の戻り先
  const [activeTab, setActiveTab] = useState<ProfileTabId>("vote");
  const [collections, setCollections] = useState<Collection[]>([]);
  const shared = useSharedData();
  const { createdVotesForTimeline, activity, addVote: sharedAddVote } = shared;
  const [favoriteTags, setFavoriteTags] = useState<string[]>([]);
  /** Bookmark タブでコレクション or ALL を選択中。null = TOP（リスト表示） */
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<null | "all" | string>(null);
  /** ブックマーク先選択モーダルを開くカードID */
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [cardOptionsCardId, setCardOptionsCardId] = useState<string | null>(null);
  /** コレクション設定モーダル（新規追加 or 編集） */
  const [showCollectionSettings, setShowCollectionSettings] = useState(false);
  /** 編集中のコレクション（null = 新規追加） */
  const [editingCollectionForSettings, setEditingCollectionForSettings] = useState<Collection | null>(null);
  /** 3点リーダーメニューを開いているコレクションID */
  const [collectionMenuOpenId, setCollectionMenuOpenId] = useState<string | null>(null);
  /** myVOTE 編集モード（カード削除用） */
  const [isMyVoteEditMode, setIsMyVoteEditMode] = useState(false);
  /** 作ったVOTE一覧の再取得用 */
  const [createdVotesRefreshKey, setCreatedVotesRefreshKey] = useState(0);
  /** myVOTE 並び順 */
  const [myVoteSortOrder, setMyVoteSortOrder] = useState<"newest" | "oldest">("newest");
  /** myVOTE 新着順プルダウン開閉 */
  const [myVoteSortDropdownOpen, setMyVoteSortDropdownOpen] = useState(false);
  /** 投票タブ 並び順 */
  const [voteTabSortOrder, setVoteTabSortOrder] = useState<"newest" | "oldest">("newest");
  /** 投票タブ 新着順プルダウン開閉 */
  const [voteTabSortDropdownOpen, setVoteTabSortDropdownOpen] = useState(false);
  /** ログイン状態（LINEのみ。未ログイン時はログイン画面を表示） */
  const [auth, setAuth] = useState(() => getAuth());

  useEffect(() => {
    setCollections(getCollections());
  }, []);

  useEffect(() => {
    const handler = () => {
      setAuth(getAuth());
      setFavoriteTags(getFavoriteTags());
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

  useEffect(() => {
    const eventName = getCollectionsUpdatedEventName();
    const handler = () => setCollections(getCollections());
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  const [bookmarkRefreshKey, setBookmarkRefreshKey] = useState(0);
  useEffect(() => {
    const eventName = getBookmarksUpdatedEventName();
    const handler = () => setBookmarkRefreshKey((k) => k + 1);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  useEffect(() => {
    const eventName = getCreatedVotesUpdatedEventName();
    const handler = () => setCreatedVotesRefreshKey((k) => k + 1);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  const profileUser = auth.user ?? MOCK_USER;
  const currentUser: CurrentUser = auth.isLoggedIn
    ? { type: "sns", name: profileUser.name, iconUrl: profileUser.iconUrl }
    : { type: "guest" };

  const userId = typeof window !== "undefined" ? getCurrentActivityUserId() : "";
  const createdVotesRaw = useMemo(() => {
    if (typeof window === "undefined") return [];
    if (shared.isRemote) {
      return createdVotesForTimeline.filter((c) => c.createdByUserId === userId);
    }
    return getCreatedVotes();
  }, [shared.isRemote, createdVotesForTimeline, createdVotesRefreshKey, userId]);
  const createdVotes = useMemo(() => {
    if (myVoteSortOrder === "oldest") {
      return [...createdVotesRaw].sort((a, b) => {
        const da = a.createdAt ?? "";
        const db = b.createdAt ?? "";
        return da.localeCompare(db);
      });
    }
    return createdVotesRaw;
  }, [createdVotesRaw, myVoteSortOrder]);

  const seedCards = useMemo(
    () => voteCardsData.map((c, i) => ({ ...c, id: `seed-${i}` })),
    []
  );

  /** 投票・Bookmark・コメントタブ用（全ユーザーの作ったVOTE＋シード） */
  const allCards = useMemo(
    () => [...createdVotesForTimeline, ...seedCards],
    [createdVotesForTimeline, seedCards]
  );

  const votedCardsRaw = useMemo(
    () => allCards.filter((c) => activity[c.id ?? ""]?.userSelectedOption),
    [allCards, activity]
  );
  const votedCards = useMemo(() => {
    const list = [...votedCardsRaw];
    if (voteTabSortOrder === "oldest") list.reverse();
    return list;
  }, [votedCardsRaw, voteTabSortOrder]);

  const allBookmarkedIds = useMemo(() => getBookmarkIds(), [collections, bookmarkRefreshKey, auth]);
  const bookmarkedCards = useMemo(
    () => allCards.filter((c) => allBookmarkedIds.includes(c.id ?? "")),
    [allCards, allBookmarkedIds]
  );

  const commentedCardIds = useMemo(
    () =>
      Object.entries(activity).filter(([, a]) =>
        (a.comments ?? []).some((c) => c.user?.name === MY_COMMENT_USER_NAME)
      ).map(([cid]) => cid),
    [activity]
  );

  const tabLabels: { id: ProfileTabId; label: string }[] = [
    { id: "myVOTE", label: "myVOTE" },
    { id: "vote", label: "投票" },
    { id: "bookmark", label: "Bookmark" },
    { id: "comment", label: "コメント" },
  ];

  const voteCount = createdVotes.length;
  const collectionCount = collections.length;

  /* 非ログイン時：ログイン画面（LINEのみ）。ロゴ・テキスト・ボタンを1ブロックで上下中央に */
  if (!auth.isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FFE100] pb-[50px]">
        <header className="flex shrink-0 justify-end px-[5.333vw] pt-4">
          <Link
            href="/settings"
            className="flex h-10 w-10 items-center justify-center text-gray-900"
            aria-label="設定"
          >
            <img src="/icons/icon_setting.svg" alt="" className="h-6 w-6" width={20} height={20} />
          </Link>
        </header>
        <main className="mx-auto flex min-h-0 flex-1 flex-col items-center justify-center px-[5.333vw] text-center">
          <div className="flex w-full max-w-md flex-col items-center">
            <div className="flex justify-center" style={{ transform: "scale(1.61)" }}>
              <img src="/logo.svg" alt="VOTE" className="h-16 w-auto" width={177} height={77} />
            </div>
            <div className="mt-[40px] w-full">
              <h2
                className="text-[16px] font-black text-gray-900"
                style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
              >
                ログインしよう。
              </h2>
              <p
                className="mt-4 text-[13px] font-bold text-gray-900"
                style={{
                  fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  letterSpacing: "1px",
                  lineHeight: 1.66,
                }}
              >
                VOTEにログインすると、
                <br />
                みんなに質問したり、
                <br />
                みんなから意見がもらえたり.......
                <br />
                <br />
                長い間疑問に感じていたことも、
                <br />
                ですぐに解決できるかも！
              </p>
            </div>
            <div className="mt-[30px] w-full">
              <Link
                href={returnTo ? `/profile/login?returnTo=${encodeURIComponent(returnTo)}` : "/profile/login"}
                className="block w-full rounded-xl bg-gray-900 py-4 text-center text-base font-bold text-white hover:opacity-90"
                aria-label="LINEでログインする"
              >
                LINEでログインする
              </Link>
            </div>
          </div>
        </main>
        <BottomNav activeId="profile" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[50px]">
      {/* 黄色ヘッダー（ログイン時） */}
      <div className="bg-[#FFE100] px-[5.333vw] pt-4 pb-[15px]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_0_4px_rgba(0,0,0,0.1)]"
            >
              <img
                src={profileUser.iconUrl ?? "/default-avatar.png"}
                alt=""
                className="h-full w-full object-cover"
                width={56}
                height={56}
              />
            </div>
            <div>
              <p className="font-bold text-gray-900">{profileUser.name}</p>
              <p className="profile-stats-text text-sm font-bold text-gray-900">
                <span className="text-[16px]">{voteCount}</span>
                <span className="text-[12px]"> VOTE</span>
                <span className="text-[16px]"> · {collectionCount}</span>
                <span className="text-[12px]"> COLLECTION</span>
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
                className="profile-favorite-tag shrink-0 rounded-full bg-white/60 px-4 py-2 text-[13px] text-[#191919]"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* タブバー */}
      <div className="w-full min-w-0">
        <nav className="flex w-full bg-white" aria-label="マイページタブ">
          {tabLabels.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`relative flex flex-1 min-w-0 flex-col pt-[14.4px] pb-[11.4px] text-sm font-bold ${
                activeTab === id ? "text-gray-900" : "text-gray-500"
              }`}
            >
              <span className="flex-1" aria-hidden />
              <span className="inline-block">{label}</span>
              {activeTab === id && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[4px] rounded-full bg-[#FFE100]"
                  aria-hidden
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-lg bg-[#F1F1F1] px-[5.333vw] pb-6 pt-[20px]">
        {activeTab === "myVOTE" && (
          <>
            <div className="relative mb-5 flex items-center justify-between">
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                  aria-haspopup="listbox"
                  aria-expanded={myVoteSortDropdownOpen}
                  onClick={() => setMyVoteSortDropdownOpen((o) => !o)}
                >
                  {myVoteSortOrder === "newest" ? "新着順" : "古い順"}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFE100]">
                    <img
                      src="/icons/icon_b_arrow.svg"
                      alt=""
                      className="h-2.5 w-2.5 shrink-0 rotate-0"
                      width={10}
                      height={8}
                    />
                  </span>
                </button>
                {myVoteSortDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setMyVoteSortDropdownOpen(false)}
                    />
                    <ul
                      className="absolute left-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                      role="listbox"
                    >
                      <li role="option" aria-selected={myVoteSortOrder === "newest"}>
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                          onClick={() => {
                            setMyVoteSortOrder("newest");
                            setMyVoteSortDropdownOpen(false);
                          }}
                        >
                          新着順
                        </button>
                      </li>
                      <li role="option" aria-selected={myVoteSortOrder === "oldest"}>
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                          onClick={() => {
                            setMyVoteSortOrder("oldest");
                            setMyVoteSortDropdownOpen(false);
                          }}
                        >
                          古い順
                        </button>
                      </li>
                    </ul>
                  </>
                )}
              </div>
              <button
                type="button"
                className={`text-sm font-bold text-gray-900 ${isMyVoteEditMode ? "text-blue-600" : ""}`}
                onClick={() => setIsMyVoteEditMode((prev) => !prev)}
              >
                {isMyVoteEditMode ? "完了" : "編集"}
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
                    <div key={cardId} className="relative">
                      {isMyVoteEditMode && (
                        <button
                          type="button"
                          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-blue-600"
                          style={{ boxShadow: "0 1px 1px rgba(0,0,0,0.15)" }}
                          aria-label="このVOTEを削除"
                          onClick={() => {
                            deleteCreatedVote(cardId);
                            setCreatedVotesRefreshKey((k) => k + 1);
                          }}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <VoteCard
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
                        hasCommented={commentedCardIds.includes(cardId)}
                        onBookmarkClick={setModalCardId}
                        onMoreClick={setCardOptionsCardId}
                        visibility={card.visibility}
                        optionAImageUrl={card.optionAImageUrl}
                        optionBImageUrl={card.optionBImageUrl}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "vote" && (
          <>
            <div className="relative mb-5 flex items-center justify-between">
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                  aria-haspopup="listbox"
                  aria-expanded={voteTabSortDropdownOpen}
                  onClick={() => setVoteTabSortDropdownOpen((o) => !o)}
                >
                  {voteTabSortOrder === "newest" ? "新着順" : "古い順"}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFE100]">
                    <img
                      src="/icons/icon_b_arrow.svg"
                      alt=""
                      className="h-2.5 w-2.5 shrink-0 rotate-0"
                      width={10}
                      height={8}
                    />
                  </span>
                </button>
                {voteTabSortDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setVoteTabSortDropdownOpen(false)}
                    />
                    <ul
                      className="absolute left-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                      role="listbox"
                    >
                      <li role="option" aria-selected={voteTabSortOrder === "newest"}>
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                          onClick={() => {
                            setVoteTabSortOrder("newest");
                            setVoteTabSortDropdownOpen(false);
                          }}
                        >
                          新着順
                        </button>
                      </li>
                      <li role="option" aria-selected={voteTabSortOrder === "oldest"}>
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                          onClick={() => {
                            setVoteTabSortOrder("oldest");
                            setVoteTabSortDropdownOpen(false);
                          }}
                        >
                          古い順
                        </button>
                      </li>
                    </ul>
                  </>
                )}
              </div>
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
                      bookmarked={isCardBookmarked(cardId)}
                      hasCommented={commentedCardIds.includes(cardId)}
                      onBookmarkClick={setModalCardId}
                      onMoreClick={setCardOptionsCardId}
                      visibility={card.visibility}
                      optionAImageUrl={card.optionAImageUrl}
                      optionBImageUrl={card.optionBImageUrl}
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
                {/* ALL 行（コレクション行と同じ高さに合わせる） */}
                <button
                  type="button"
                  className="flex min-h-[64px] w-full items-center rounded-xl bg-white px-4 py-3"
                  onClick={() => setSelectedBookmarkId("all")}
                >
                  <span className="text-sm font-bold text-gray-900">ALL</span>
                </button>
                <p className="mb-2 mt-3 text-sm font-bold text-gray-900">コレクション</p>
                <div className="flex flex-col gap-2">
                  {collections.map((col) => (
                    <div
                      key={col.id}
                      className="flex w-full items-center gap-3 rounded-xl bg-white pl-4 pr-[10px] py-3"
                    >
                      <Link
                        href={`/collection/${col.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span
                          className="h-10 w-10 shrink-0 rounded-full"
                          style={getCollectionGradientStyle(col.gradient, col.color)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#191919]">{col.name}</p>
                          <p className="text-xs text-gray-500">
                            登録数 {col.cardIds.length}件 · {VISIBILITY_LABEL[col.visibility]}
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        className="flex h-9 w-9 shrink-0 items-center justify-center text-[#666666]"
                        aria-label="コレクションの設定"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCollectionMenuOpenId(col.id);
                        }}
                      >
                        <img src="/icons/icon_3ten.svg" alt="" className="h-6 w-6" width={24} height={24} />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => {
                    setEditingCollectionForSettings(null);
                    setShowCollectionSettings(true);
                  }}
                >
                  新しいコレクションを追加
                </Button>
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
                            bookmarked={isCardBookmarked(cardId)}
                            hasCommented={commentedCardIds.includes(cardId)}
                            initialSelectedOption={act?.userSelectedOption ?? null}
                            onVote={(id, option) => void sharedAddVote(id, option)}
                            onBookmarkClick={setModalCardId}
                            onMoreClick={setCardOptionsCardId}
                            visibility={card.visibility}
                            optionAImageUrl={card.optionAImageUrl}
                            optionBImageUrl={card.optionBImageUrl}
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
                  const act = activity[cardId] ?? { countA: 0, countB: 0, comments: [] };
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
                          hasCommented
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
          isLoggedIn={auth.isLoggedIn}
          onCollectionsUpdated={() => setCollections(getCollections())}
        />
      )}

      {cardOptionsCardId != null && (
        <CardOptionsModal
          cardId={cardOptionsCardId}
          onClose={() => setCardOptionsCardId(null)}
        />
      )}

      {collectionMenuOpenId != null && (
        <CollectionOptionsModal
          onClose={() => setCollectionMenuOpenId(null)}
          onEdit={() => {
            const col = collections.find((c) => c.id === collectionMenuOpenId);
            if (col) {
              setEditingCollectionForSettings(col);
              setShowCollectionSettings(true);
            }
            setCollectionMenuOpenId(null);
          }}
          onDelete={() => {
            deleteCollection(collectionMenuOpenId);
            setCollections(getCollections());
            setCollectionMenuOpenId(null);
          }}
        />
      )}

      {showCollectionSettings && (
        <CollectionSettingsModal
          editingCollection={editingCollectionForSettings}
          onClose={() => {
            setShowCollectionSettings(false);
            setEditingCollectionForSettings(null);
          }}
          onSave={(name, gradient, visibility) => {
            if (editingCollectionForSettings) {
              updateCollection(editingCollectionForSettings.id, { name, gradient, visibility });
            } else {
              createCollection(name, { gradient, visibility });
            }
            setCollections(getCollections());
            setShowCollectionSettings(false);
            setEditingCollectionForSettings(null);
          }}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F1F1F1]">読み込み中...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
