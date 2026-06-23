"use client";

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import VoteCard from "../components/VoteCard";
import TagSearchLink from "../components/TagSearchLink";
import { VoteCardList, VoteCardMasonryTile } from "../components/VoteCardList";
import { getCreatedVotes, deleteCreatedVote, getCreatedVotesUpdatedEventName } from "../data/createdVotes";
import { voteCardsData, resolveStableVoteCardId } from "../data/voteCards";
import {
  addCommentLike,
  COMMENT_LIKES_BY_ME_UPDATED_EVENT,
  getCommentIdsLikedByCurrentUser,
  getMergedCounts,
  isCommentAuthoredByCurrentUser,
  type CardActivity,
  type VoteComment,
} from "../data/voteCardActivity";
import { useSharedData } from "../context/SharedDataContext";
import { useEnsureCollectionsHydrated } from "../hooks/useEnsureCollectionsHydrated";
import { getCurrentActivityUserId } from "../data/auth";
import { removeFavoriteTag } from "../data/favoriteTags";
import {
  getCollections,
  createOwnedCollectionFromSettings,
  updateCollection,
  deleteCollection,
  syncCollectionToApiAndWait,
  type Collection,
  type CollectionVisibility,
} from "../data/collections";
import { getBookmarkIds, isCardBookmarked, getBookmarksUpdatedEventName } from "../data/bookmarks";
import { getCollectionGradientStyle } from "../data/search";
import { perfMeasure } from "../lib/perf";
import { buildVoteCardProps } from "../lib/buildVoteCardProps";
import { resolveCardBackgroundUrl } from "../lib/resolveCardBackgroundUrl";
import { useAuthState } from "../hooks/useAuthState";
import { useFavoriteTags } from "../hooks/useFavoriteTags";
import { useLocalCollections } from "../hooks/useLocalCollections";
import { useCardModerationFlow } from "../hooks/useCardModerationFlow";
import CardModerationModals from "../components/CardModerationModals";
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
import type { VoteCardData } from "../data/voteCards";
import type { CurrentUser } from "../components/VoteCard";
import VoteCardMini from "../components/VoteCardMini";
import Button from "../components/Button";
import CollectionSettingsModal from "../components/CollectionSettingsModal";
import CollectionOptionsModal from "../components/CollectionOptionsModal";
import MemberCollectionShareSheet from "../components/MemberCollectionShareSheet";
import NewestOldestSortDropdown from "../components/NewestOldestSortDropdown";
import CommentThreadGroup from "../components/CommentThreadGroup";
import UnderlineTabBar, { type UnderlineTabItem } from "../components/UnderlineTabBar";

const VISIBILITY_LABEL: Record<CollectionVisibility, string> = {
  public: "公開",
  private: "非公開",
  member: "メンバー限定",
};

const MOCK_USER = {
  name: "love_nitaku",
  iconUrl: "/default-avatar.png",
  voteCount: 120,
  collectionCount: 4,
};

/** 375px 幅時にコンテンツ 335px 相当（335/375） */
const PROFILE_COMMENT_CONTENT_WIDTH_CLASS =
  "mx-auto w-[min(100%,calc(100vw*335/375))]";

type ProfileTabId = "myVOTE" | "vote" | "bookmark" | "myCommunity" | "comment";

const PROFILE_TAB_IDS: ProfileTabId[] = ["myVOTE", "vote", "bookmark", "myCommunity", "comment"];

function parseProfileTabFromUrl(raw: string | null): ProfileTabId {
  if (raw && PROFILE_TAB_IDS.includes(raw as ProfileTabId)) return raw as ProfileTabId;
  return "vote";
}

type ProfileCommentDisplayRow = {
  key: string;
  comment: VoteComment;
  rowVariant: "default" | "dimmed";
  threadIndex: number;
};

/** 自分のコメント・返信を並べ、他人の親コメントは必要時のみグレーで前置 */
function buildProfileCommentDisplayRows(
  allComments: VoteComment[],
  myCommentsSorted: VoteComment[],
  opts: { isLoggedIn: boolean; displayName?: string | undefined }
): ProfileCommentDisplayRow[] {
  const shownParentIds = new Set<string>();
  const rows: ProfileCommentDisplayRow[] = [];
  let i = 0;

  for (const mc of myCommentsSorted) {
    if (mc.parentId) {
      const parent = allComments.find((c) => c.id === mc.parentId);
      const parentIsOther =
        Boolean(parent) && !isCommentAuthoredByCurrentUser(parent!.user?.name, opts);

      if (parentIsOther && parent && !shownParentIds.has(parent.id)) {
        shownParentIds.add(parent.id);
        rows.push({
          key: `parent-${parent.id}-${i++}`,
          comment: parent,
          rowVariant: "dimmed",
          threadIndex: 0,
        });
        rows.push({
          key: `mine-${mc.id}-${i++}`,
          comment: mc,
          rowVariant: "default",
          threadIndex: 1,
        });
      } else if (parentIsOther && parent && shownParentIds.has(parent.id)) {
        rows.push({
          key: `mine-${mc.id}-${i++}`,
          comment: mc,
          rowVariant: "default",
          threadIndex: 1,
        });
      } else {
        rows.push({
          key: `mine-${mc.id}-${i++}`,
          comment: mc,
          rowVariant: "default",
          threadIndex: 0,
        });
      }
    } else {
      rows.push({
        key: `mine-${mc.id}-${i++}`,
        comment: mc,
        rowVariant: "default",
        threadIndex: 0,
      });
    }
  }
  return rows;
}

/** 表示行を親＋返信の塊にまとめる（みんなのコメントの CommentThreadGroup 用） */
function groupProfileCommentDisplayRows(
  rows: ProfileCommentDisplayRow[]
): { parent: VoteComment; replies: VoteComment[] }[] {
  const groups: { parent: VoteComment; replies: VoteComment[] }[] = [];
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    if (r.rowVariant === "dimmed") {
      const parent = r.comment;
      i++;
      const replies: VoteComment[] = [];
      while (i < rows.length && rows[i].comment.parentId === parent.id) {
        replies.push(rows[i].comment);
        i++;
      }
      groups.push({ parent, replies });
    } else {
      groups.push({ parent: r.comment, replies: [] });
      i++;
    }
  }
  return groups;
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

function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsKey = searchParams.toString();
  const tabFromUrl = searchParams.get("tab");
  const bookmarkFromUrl = searchParams.get("bookmark");
  const communityFromUrl = searchParams.get("community");
  const returnTo = searchParams.get("returnTo"); // 未ログインでVOTE作成から来た場合の戻り先
  const [activeTab, setActiveTab] = useState<ProfileTabId>(() => parseProfileTabFromUrl(tabFromUrl));
  const auth = useAuthState();
  const { collections, setCollections, refreshCollections } = useLocalCollections();
  const { favoriteTags, refreshFavoriteTags } = useFavoriteTags();
  const moderation = useCardModerationFlow();
  const shared = useSharedData();
  useEnsureCollectionsHydrated();
  const {
    createdVotesForTimeline,
    activity,
    addVote: sharedAddVote,
    removeCreatedVote: sharedRemoveCreatedVote,
    refetchCreatedVotes,
  } = shared;
  /** マイコミュニティタブで一覧 or 個別を選択中。null = TOP */
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(() => {
    if (communityFromUrl) return communityFromUrl;
    return null;
  });

  const replaceProfileQuery = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParamsKey);
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParamsKey]
  );

  /** 旧URL ?tab=bookmark&bookmark=<id> をマイコミュニティへ誘導 */
  useEffect(() => {
    if (tabFromUrl !== "bookmark" || !bookmarkFromUrl || bookmarkFromUrl === "all") return;
    replaceProfileQuery((params) => {
      params.set("tab", "myCommunity");
      params.set("community", bookmarkFromUrl);
      params.delete("bookmark");
    });
  }, [tabFromUrl, bookmarkFromUrl, replaceProfileQuery]);

  /** ブラウザの戻る／進む・URL直打ちでタブ・マイコミュニティ内階層を URL と一致させる */
  useEffect(() => {
    const tab = parseProfileTabFromUrl(tabFromUrl);
    setActiveTab(tab);
    if (communityFromUrl) {
      setSelectedCommunityId(communityFromUrl);
      return;
    }
    setSelectedCommunityId(null);
  }, [tabFromUrl, communityFromUrl]);

  const selectProfileTab = useCallback(
    (id: ProfileTabId) => {
      setActiveTab(id);
      if (id !== "myCommunity") setSelectedCommunityId(null);
      replaceProfileQuery((params) => {
        if (id === "vote") {
          params.delete("tab");
          params.delete("bookmark");
          params.delete("community");
        } else {
          params.set("tab", id);
          if (id !== "myCommunity") params.delete("community");
          params.delete("bookmark");
        }
      });
    },
    [replaceProfileQuery]
  );

  const openCommunityView = useCallback(
    (communityId: string) => {
      setSelectedCommunityId(communityId);
      replaceProfileQuery((params) => {
        params.set("tab", "myCommunity");
        params.set("community", communityId);
      });
    },
    [replaceProfileQuery]
  );

  const closeCommunityView = useCallback(() => {
    setSelectedCommunityId(null);
    replaceProfileQuery((params) => {
      params.set("tab", "myCommunity");
      params.delete("community");
    });
  }, [replaceProfileQuery]);

  /** マイコミュニティタブ3点リーダー「シェアする」→ コレ画面の飛行機アイコンと同じ半モーダル */
  const handleCollectionMenuShare = useCallback(
    async (collectionId: string) => {
      const col = collections.find((c) => c.id === collectionId);
      if (!col || col.visibility !== "member") return;
      const ok = await syncCollectionToApiAndWait(col);
      if (ok) setShareSheetCollectionId(collectionId);
    },
    [collections]
  );
  /** コレクション設定モーダル（新規追加 or 編集） */
  const [showCollectionSettings, setShowCollectionSettings] = useState(false);
  /** 編集中のコレクション（null = 新規追加） */
  const [editingCollectionForSettings, setEditingCollectionForSettings] = useState<Collection | null>(null);
  /** 3点リーダーメニューを開いているコレクションID */
  const [collectionMenuOpenId, setCollectionMenuOpenId] = useState<string | null>(null);
  /** メンバー限定コレのシェア半モーダル（マイコミュニティタブの3点リーダーから） */
  const [shareSheetCollectionId, setShareSheetCollectionId] = useState<string | null>(null);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>(() => getHiddenUserIds());
  const [hiddenCardIds, setHiddenCardIds] = useState<string[]>(() => getHiddenCardIds());
  /** myVOTE 編集モード（カード削除用） */
  const [isMyVoteEditMode, setIsMyVoteEditMode] = useState(false);
  /** お気に入りタグ編集モード（タグ削除用） */
  const [isFavoriteTagsEditMode, setIsFavoriteTagsEditMode] = useState(false);
  /** 作ったVOTE一覧の再取得用 */
  const [createdVotesRefreshKey, setCreatedVotesRefreshKey] = useState(0);
  /** myVOTE リモート削除中（API 待ち） */
  const [myVoteDeleteInProgress, setMyVoteDeleteInProgress] = useState(false);
  /** 体感：すぐ終わるときは出さず、少し遅れてから表示 */
  const [showMyVoteDeletingDialog, setShowMyVoteDeletingDialog] = useState(false);
  const myVoteDeleteDelayTimerRef = useRef<number | null>(null);
  /** myVOTE 並び順 */
  const [myVoteSortOrder, setMyVoteSortOrder] = useState<"newest" | "oldest">("newest");
  /** 投票タブ 並び順 */
  const [voteTabSortOrder, setVoteTabSortOrder] = useState<"newest" | "oldest">("newest");
  useEffect(() => {
    if (auth.isLoggedIn && auth.userId) refreshCollections();
  }, [auth.isLoggedIn, auth.userId, refreshCollections]);

  useEffect(() => {
    if (auth.isLoggedIn) refreshFavoriteTags();
  }, [auth.isLoggedIn, auth.userId, refreshFavoriteTags]);

  const [bookmarkRefreshKey, setBookmarkRefreshKey] = useState(0);
  useEffect(() => {
    const eventName = getBookmarksUpdatedEventName();
    const handler = () => setBookmarkRefreshKey((k) => k + 1);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  const [, setCommentLikesRefreshKey] = useState(0);
  useEffect(() => {
    const handler = () => setCommentLikesRefreshKey((k) => k + 1);
    window.addEventListener(COMMENT_LIKES_BY_ME_UPDATED_EVENT, handler);
    return () => window.removeEventListener(COMMENT_LIKES_BY_ME_UPDATED_EVENT, handler);
  }, []);

  useEffect(() => {
    const eventName = getCreatedVotesUpdatedEventName();
    const handler = () => setCreatedVotesRefreshKey((k) => k + 1);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  useEffect(() => {
    if (!myVoteDeleteInProgress) {
      if (myVoteDeleteDelayTimerRef.current != null) {
        clearTimeout(myVoteDeleteDelayTimerRef.current);
        myVoteDeleteDelayTimerRef.current = null;
      }
      setShowMyVoteDeletingDialog(false);
      return;
    }
    myVoteDeleteDelayTimerRef.current = window.setTimeout(() => {
      myVoteDeleteDelayTimerRef.current = null;
      setShowMyVoteDeletingDialog(true);
    }, 320);
    return () => {
      if (myVoteDeleteDelayTimerRef.current != null) {
        clearTimeout(myVoteDeleteDelayTimerRef.current);
        myVoteDeleteDelayTimerRef.current = null;
      }
    };
  }, [myVoteDeleteInProgress]);

  const handleDeleteMyVote = useCallback(
    async (cardId: string) => {
      if (shared.isRemote) {
        setMyVoteDeleteInProgress(true);
        try {
          const uid = getCurrentActivityUserId();
          const res = await fetch("/api/created-votes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              delete: true,
              userId: uid,
              cardId,
            }),
          });
          if (res.ok) {
            deleteCreatedVote(cardId);
            sharedRemoveCreatedVote(cardId);
          } else {
            await refetchCreatedVotes();
          }
        } catch {
          await refetchCreatedVotes();
        } finally {
          setCreatedVotesRefreshKey((k) => k + 1);
          setMyVoteDeleteInProgress(false);
        }
        return;
      }
      deleteCreatedVote(cardId);
      sharedRemoveCreatedVote(cardId);
      setCreatedVotesRefreshKey((k) => k + 1);
    },
    [shared.isRemote, sharedRemoveCreatedVote, refetchCreatedVotes]
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

  const profileUser = auth.user ?? MOCK_USER;
  const currentUser = useMemo<CurrentUser>(() => {
    if (!auth.isLoggedIn) return { type: "guest" };
    const u = auth.user ?? MOCK_USER;
    return { type: "sns", name: u.name, iconUrl: u.iconUrl };
  }, [auth.isLoggedIn, auth.user]);
  const userId = typeof window !== "undefined" ? getCurrentActivityUserId() : "";
  /** myVOTEタブ用：API利用時はContextから、それ以外はlocalStorageから「自分が作ったVOTE」を表示 */
  const createdVotesRaw = useMemo(() => {
    if (typeof window === "undefined") return [];
    if (shared.isRemote) {
      const localMineIds = new Set(getCreatedVotes().map((c) => resolveStableVoteCardId(c)));
      return createdVotesForTimeline.filter((c) => {
        const id = resolveStableVoteCardId(c);
        if (c.createdByUserId === userId) return true;
        // 旧データで createdByUserId が無いがローカルに自分の作成としてあるもの
        return !c.createdByUserId && localMineIds.has(id);
      });
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

  const votedCardsRaw = useMemo(
    () => allCardsFiltered.filter((c) => activity[resolveStableVoteCardId(c)]?.userSelectedOption),
    [allCardsFiltered, activity]
  );
  const votedCards = useMemo(() => {
    const list = [...votedCardsRaw];
    if (voteTabSortOrder === "oldest") list.reverse();
    return list;
  }, [votedCardsRaw, voteTabSortOrder]);

  /** Bookmarkタブ: ブックマーク登録のみ（コミュニティとは別） */
  const bookmarkOnlyIds = useMemo(() => getBookmarkIds(), [bookmarkRefreshKey, auth]);

  const bookmarkListViewModels = useMemo(() => {
    return perfMeasure("profile.bookmarkListViewModels", () => {
      const out: Array<{ card: VoteCardData; cardId: string; bgUrl: string }> = [];
      for (const cardId of bookmarkOnlyIds) {
        const card = allCardsFiltered.find((c) => resolveStableVoteCardId(c) === cardId);
        if (!card) continue;
        out.push({
          card,
          cardId,
          bgUrl: resolveCardBackgroundUrl(card, cardId),
        });
      }
      return out;
    });
  }, [bookmarkOnlyIds, allCardsFiltered]);

  const communityListViewModels = useMemo(() => {
    if (selectedCommunityId == null) return [];
    const ids = collections.find((c) => c.id === selectedCommunityId)?.cardIds ?? [];
    const out: Array<{ card: VoteCardData; cardId: string; bgUrl: string }> = [];
    for (const cardId of ids) {
      const card = allCardsFiltered.find((c) => resolveStableVoteCardId(c) === cardId);
      if (!card) continue;
      out.push({
        card,
        cardId,
        bgUrl: resolveCardBackgroundUrl(card, cardId),
      });
    }
    return out;
  }, [selectedCommunityId, collections, allCardsFiltered]);

  const commentedCardIds = useMemo(
    () =>
      Object.entries(activity)
        .filter(([, a]) =>
          (a.comments ?? []).some((c) =>
            isCommentAuthoredByCurrentUser(c.user?.name, {
              isLoggedIn: auth.isLoggedIn,
              displayName: auth.user?.name,
            })
          )
        )
        .map(([cid]) => cid),
    [activity, auth.isLoggedIn, auth.user?.name]
  );

  const commentedCardIdSet = useMemo(() => new Set(commentedCardIds), [commentedCardIds]);

  const handleProfileCardMoreClick = useCallback(
    (cardId: string) => {
      const target = allCardsFiltered.find((c) => resolveStableVoteCardId(c) === cardId);
      moderation.openCardOptions(cardId, target?.createdByUserId === userId);
    },
    [allCardsFiltered, userId, moderation]
  );

  /** HOME / 検索と同じ participate 投票（myVOTE・Bookmark 内一覧） */
  const handleProfileParticipateVote = useCallback(
    (id: string, option: "A" | "B") => {
      void sharedAddVote(id, option);
    },
    [sharedAddVote]
  );

  /** コメントタブ用：自分のコメントの最新日時でカードを最新順に並べる */
  const commentedCardIdsNewestFirst = useMemo(() => {
    const opts = { isLoggedIn: auth.isLoggedIn, displayName: auth.user?.name };
    return [...commentedCardIds].sort((cardIdA, cardIdB) => {
      const actA = activity[cardIdA] ?? { comments: [] };
      const actB = activity[cardIdB] ?? { comments: [] };
      const myA = (actA.comments ?? []).filter((c) => isCommentAuthoredByCurrentUser(c.user?.name, opts));
      const myB = (actB.comments ?? []).filter((c) => isCommentAuthoredByCurrentUser(c.user?.name, opts));
      const latestA = myA.length ? Math.max(...myA.map((c) => new Date(c.date ?? 0).getTime())) : 0;
      const latestB = myB.length ? Math.max(...myB.map((c) => new Date(c.date ?? 0).getTime())) : 0;
      return latestB - latestA;
    });
  }, [commentedCardIds, activity, auth.isLoggedIn, auth.user?.name]);

  const tabLabels: UnderlineTabItem<ProfileTabId>[] = useMemo(
    () => [
      { id: "myVOTE", label: "myVOTE" },
      { id: "vote", label: "投票" },
      { id: "bookmark", label: "Bookmark" },
      { id: "myCommunity", label: "コレクション" },
      { id: "comment", label: "コメント" },
    ],
    []
  );

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
                style={{ fontFamily: "var(--font-lato), var(--font-noto-sans-jp), sans-serif" }}
              >
                ログインしよう。
              </h2>
              <p
                className="mt-4 text-[13px] font-bold text-gray-900"
                style={{
                  fontFamily: "var(--font-lato), var(--font-noto-sans-jp), sans-serif",
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
                className="block w-full rounded-[10px] bg-gray-900 py-4 text-center text-base font-bold text-white hover:opacity-90"
                aria-label="LINEでログインする"
              >
                LINEでログインする
              </Link>
            </div>
          </div>
        </main>
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
                decoding="async"
                fetchPriority="high"
              />
            </div>
            <div>
              <p className="font-bold text-gray-900">{profileUser.name}</p>
              <p className="profile-stats-text text-sm font-bold text-gray-900">
                <span className="text-[16px]">{voteCount}</span>
                <span className="text-[12px]"> VOTE</span>
                <span className="text-[16px]"> · {collectionCount}</span>
                <span className="text-[12px]"> コレクション</span>
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
            <span className="flex items-center gap-1 text-sm font-bold text-[#191919]">
              <img
                src={favoriteTags.length > 0 ? "/icons/icon_heart_on_dark.svg" : "/icons/icon_heart.svg"}
                alt=""
                className="h-4 w-4"
                width={18}
                height={16}
              />
              お気に入りタグ
            </span>
            {isFavoriteTagsEditMode ? (
              <button
                type="button"
                className="text-sm font-bold text-[#191919] no-underline"
                onClick={() => setIsFavoriteTagsEditMode(false)}
              >
                保存
              </button>
            ) : (
              <button
                type="button"
                className="text-sm font-bold text-[#191919] no-underline"
                onClick={() => setIsFavoriteTagsEditMode(true)}
              >
                編集
              </button>
            )}
          </div>
          {isFavoriteTagsEditMode ? (
            <div className="mt-2 flex flex-wrap gap-2 pb-1">
              {favoriteTags.length === 0 ? (
                <p className="py-3 text-sm text-gray-500">お気に入りタグがありません。</p>
              ) : (
                favoriteTags.map((tag) => (
                  <span
                    key={tag}
                    className="profile-favorite-tag inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/60 pl-4 pr-1.5 py-2 text-[13px] text-[#191919]"
                  >
                    {tag}
                    <button
                      type="button"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                      aria-label={`${tag} を削除`}
                      onClick={() => {
                        removeFavoriteTag(tag);
                        refreshFavoriteTags();
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          ) : (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {favoriteTags.map((tag) => (
                <TagSearchLink key={tag} tag={tag} variant="profilePill" />
              ))}
            </div>
          )}
        </div>
      </div>

      <UnderlineTabBar
        items={tabLabels}
        activeId={activeTab}
        onSelect={selectProfileTab}
        ariaLabel="マイページタブ"
        layout="equalScroll"
      />

      <main className="home-feed-main mx-auto bg-[#F1F1F1] px-[5.333vw] pb-6 pt-[20px] sm:px-6">
        {activeTab === "myVOTE" && (
          <>
            <div className="relative mb-5 flex items-center justify-between">
              <NewestOldestSortDropdown
                value={myVoteSortOrder}
                onChange={setMyVoteSortOrder}
                arrowStroke="#787878"
              />
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
              <VoteCardList masonry>
                {createdVotes.map((card) => {
                  const cardId = resolveStableVoteCardId(card);
                  const act = activity[cardId];
                  return (
                    <VoteCardMasonryTile key={cardId}>
                    <div className="relative">
                      {isMyVoteEditMode && (
                        <button
                          type="button"
                          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-red-600 shadow-md hover:bg-red-50"
                          aria-label="このVOTEを削除"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleDeleteMyVote(cardId);
                          }}
                        >
                          ×
                        </button>
                      )}
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
                          onVote: handleProfileParticipateVote,
                        })}
                      />
                    </div>
                    </VoteCardMasonryTile>
                  );
                })}
              </VoteCardList>
            )}
          </>
        )}

        {activeTab === "vote" && (
          <>
            <div className="relative mb-5 flex items-center justify-between">
              <NewestOldestSortDropdown
                value={voteTabSortOrder}
                onChange={setVoteTabSortOrder}
                arrowStroke="#787878"
              />
            </div>
            {votedCards.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-white px-6 py-12 text-center">
                <p className="text-sm text-gray-500">投票したVOTEがここに表示されます。</p>
              </div>
            ) : (
              <VoteCardList className="mt-4" masonry>
                {votedCards.map((card) => {
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
                        surface: "votedHistory",
                        backgroundImageUrl: resolveCardBackgroundUrl(card, cardId),
                        bookmarked: isCardBookmarked(cardId),
                        hasCommented: commentedCardIdSet.has(cardId),
                      })}
                    />
                    </VoteCardMasonryTile>
                  );
                })}
              </VoteCardList>
            )}
          </>
        )}

        {activeTab === "bookmark" && (
          <>
            {bookmarkListViewModels.length === 0 ? (
              <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-500">ブックマークした投稿がここに表示されます。</p>
              </div>
            ) : (
              <VoteCardList masonry>
                {bookmarkListViewModels.map(({ card, cardId, bgUrl }) => {
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
                        backgroundImageUrl: bgUrl,
                        bookmarked: isCardBookmarked(cardId),
                        hasCommented: commentedCardIdSet.has(cardId),
                        onVote: handleProfileParticipateVote,
                        onMoreClick: handleProfileCardMoreClick,
                      })}
                    />
                    </VoteCardMasonryTile>
                  );
                })}
              </VoteCardList>
            )}
          </>
        )}

        {activeTab === "myCommunity" && (
          <>
            {selectedCommunityId == null ? (
              <div className="flex flex-col gap-2">
                {collections.map((col) => (
                  <div
                    key={col.id}
                    className="flex w-full items-center gap-3 rounded-xl bg-white pl-4 pr-[10px] py-3"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => openCommunityView(col.id)}
                    >
                      <span
                        className="h-10 w-10 shrink-0 rounded-full"
                        style={getCollectionGradientStyle(col.gradient, col.color)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#191919]">{col.name}</p>
                        <p className="text-xs text-gray-500">
                          登録数 {col.cardIds.length}件 · {VISIBILITY_LABEL[col.visibility]}
                          {col.joinedParticipation ? " · 参加中" : ""}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center text-[#666666]"
                        aria-label="コレクションの設定"
                      onClick={() => setCollectionMenuOpenId(col.id)}
                    >
                      <img src="/icons/icon_3ten.svg" alt="" className="h-6 w-6" width={24} height={24} />
                    </button>
                  </div>
                ))}
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
              <>
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center text-gray-600"
                    aria-label="戻る"
                    onClick={closeCommunityView}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                  </button>
                  <span className="text-sm font-bold text-gray-900">
                    {collections.find((c) => c.id === selectedCommunityId)?.name ?? "コレクション"}
                  </span>
                </div>
                {communityListViewModels.length === 0 ? (
                  <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                    <p className="text-sm text-gray-500">このコレクションにはまだ投稿がありません。</p>
                  </div>
                ) : (
                  <VoteCardList>
                    {communityListViewModels.map(({ card, cardId, bgUrl }) => {
                      const act = activity[cardId];
                      return (
                        <VoteCard
                          key={cardId}
                          {...buildVoteCardProps({
                            card,
                            cardId,
                            activity: act,
                            currentUser,
                            surface: "participate",
                            backgroundImageUrl: bgUrl,
                            bookmarked: isCardBookmarked(cardId),
                            hasCommented: commentedCardIdSet.has(cardId),
                            onVote: handleProfileParticipateVote,
                            onMoreClick: handleProfileCardMoreClick,
                          })}
                        />
                      );
                    })}
                  </VoteCardList>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "comment" && (
          <>
            {commentedCardIds.length === 0 ? (
              <div className={PROFILE_COMMENT_CONTENT_WIDTH_CLASS}>
                <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-black/[0.06]">
                  <p className="text-sm text-[#787878]">コメントしたVOTEがここに表示されます。</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {commentedCardIdsNewestFirst.map((cardId) => {
                  const card = allCardsFiltered.find((c) => resolveStableVoteCardId(c) === cardId);
                  if (!card) return null;
                  const act = activity[cardId] ?? { countA: 0, countB: 0, comments: [] };
                  const merged = getMergedCounts(
                    card.countA ?? 0,
                    card.countB ?? 0,
                    card.commentCount ?? 0,
                    act
                  );
                  const myCommentsSorted = (act.comments ?? [])
                    .filter((c) =>
                      isCommentAuthoredByCurrentUser(c.user?.name, {
                        isLoggedIn: auth.isLoggedIn,
                        displayName: auth.user?.name,
                      })
                    )
                    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
                  const displayRows = buildProfileCommentDisplayRows(act.comments ?? [], myCommentsSorted, {
                    isLoggedIn: auth.isLoggedIn,
                    displayName: auth.user?.name,
                  });
                  const threadGroups = groupProfileCommentDisplayRows(displayRows);
                  const currentCard = {
                    countA: act.countA ?? 0,
                    countB: act.countB ?? 0,
                    comments: act.comments ?? [],
                  };
                  const likedCommentIds = getCommentIdsLikedByCurrentUser(cardId);
                  const threadHref = `/comments/${cardId}`;
                  return (
                    <div key={cardId} className="flex flex-col">
                      <Link
                        href={threadHref}
                        className="block transition-opacity active:opacity-90"
                      >
                          <VoteCardMini
                            backgroundImageUrl={resolveCardBackgroundUrl(card, cardId)}
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
                            periodStart={card.periodStart}
                            periodEnd={card.periodEnd}
                            expandMiniForCommentsPage
                            hideFooterIconRow
                          />
                      </Link>
                      <div className="bg-[#F1F1F1] pt-3 pb-1">
                        <div className={PROFILE_COMMENT_CONTENT_WIDTH_CLASS}>
                          {threadGroups.map((g, gi) => (
                            <CommentThreadGroup
                              key={`${cardId}-${g.parent.id}-${gi}`}
                              parent={g.parent}
                              replies={g.replies}
                              likedCommentIds={likedCommentIds}
                              onParentLike={() => addCommentLike(cardId, g.parent.id, currentCard)}
                              onParentReply={() => {}}
                              onReplyLike={(r) => addCommentLike(cardId, r.id, currentCard)}
                              canReply={false}
                              parentReplyThreadHref={threadHref}
                              replyToReplyHref={threadHref}
                              threadInnerFlush
                              threadConnectorTone="darkOnGray"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {showMyVoteDeletingDialog ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-6"
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="max-w-sm rounded-2xl bg-white px-8 py-7 text-center shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <p className="text-base font-bold leading-relaxed text-[#191919]">削除中・・・👷</p>
          </div>
        </div>
      ) : null}

      <CardModerationModals
        cardOptionsCardId={moderation.cardOptionsCardId}
        cardOptionsIsOwnCard={moderation.cardOptionsIsOwnCard}
        reportCardId={moderation.reportCardId}
        addToCommunityCardId={moderation.addToCommunityCardId}
        isLoggedIn={auth.isLoggedIn}
        onCloseOptions={moderation.closeCardOptions}
        onAddToCommunity={moderation.openAddToCommunity}
        onCloseAddToCommunity={moderation.closeAddToCommunity}
        onCollectionsUpdated={refreshCollections}
        onHideCard={(cardId) => {
          const target = allCards.find((c) => resolveStableVoteCardId(c) === cardId);
          if (target?.createdByUserId) addHiddenUser(target.createdByUserId);
          addHiddenCard(cardId);
          setHiddenUserIds(getHiddenUserIds());
          setHiddenCardIds(getHiddenCardIds());
          moderation.closeCardOptions();
        }}
        onReportCard={moderation.openReport}
        onCloseReport={moderation.closeReport}
      />

      {collectionMenuOpenId != null && (() => {
        const menuCol = collections.find((c) => c.id === collectionMenuOpenId);
        return (
        <CollectionOptionsModal
          showShare={menuCol?.visibility === "member"}
          onShare={() => void handleCollectionMenuShare(collectionMenuOpenId)}
          hideEdit={Boolean(menuCol?.joinedParticipation)}
          deleteLabel={menuCol?.joinedParticipation ? "マイリストから削除" : "コレクションを削除"}
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
            if (selectedCommunityId === collectionMenuOpenId) {
              closeCommunityView();
            }
            setCollectionMenuOpenId(null);
          }}
        />
        );
      })()}

      {shareSheetCollectionId != null && (
        <MemberCollectionShareSheet
          open
          onClose={() => setShareSheetCollectionId(null)}
          collectionId={shareSheetCollectionId}
        />
      )}

      {showCollectionSettings && (
        <CollectionSettingsModal
          editingCollection={editingCollectionForSettings}
          onClose={() => {
            setShowCollectionSettings(false);
            setEditingCollectionForSettings(null);
          }}
          onSave={async (name, gradient, visibility, category) => {
            if (editingCollectionForSettings) {
              updateCollection(editingCollectionForSettings.id, { name, gradient, visibility, category });
            } else {
              await createOwnedCollectionFromSettings(name, { gradient, visibility, category });
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
