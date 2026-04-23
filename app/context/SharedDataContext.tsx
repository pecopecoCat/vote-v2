"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { resolveStableVoteCardId, type VoteCardData } from "../data/voteCards";
import { isVotingAllowedNow, resolveCardForVotePeriod } from "../data/votePeriod";
import type { CardActivity } from "../data/voteCardActivity";
import {
  getCreatedVotesForTimeline,
  addCreatedVote as addCreatedVoteLocal,
  getCreatedVotesUpdatedEventName,
} from "../data/createdVotes";
import {
  getAllActivity,
  addVote as addVoteLocal,
  addComment as addCommentLocal,
  removeComment as removeCommentLocal,
  ACTIVITY_GLOBAL_UPDATED_EVENT,
} from "../data/voteCardActivity";
import { getCurrentActivityUserId, getAuthUpdatedEventName, getAuth } from "../data/auth";
import {
  hydrateParticipatedMemberCollectionsFromRemote,
  hydrateUserOwnedCollectionsFromRemote,
} from "../data/collections";
import { hydrateBookmarksFromRemote } from "../data/bookmarks";
import type { MemberJoinOwnerEvent } from "../lib/memberJoinOwnerNotifications";
import { normalizeCardIdKey, normalizeKeyedRows } from "../lib/normalize";

export type { MemberJoinOwnerEvent };

function isCommentsDisabledOnCard(cardId: string, timeline: VoteCardData[]): boolean {
  if (!cardId.startsWith("created-")) return false;
  return timeline.some((c) => c.id === cardId && c.commentsDisabled === true);
}

const CREATED_VOTES_API = "/api/created-votes";
const ACTIVITY_API = "/api/activity";

function normalizeCardFromApi(raw: { userId?: string; card?: unknown }): VoteCardData | null {
  const card = raw?.card;
  if (!card || typeof card !== "object") return null;
  const c = card as Record<string, unknown>;
  const question = typeof c.question === "string" ? c.question : "";
  const optionA = typeof c.optionA === "string" ? c.optionA : "";
  const optionB = typeof c.optionB === "string" ? c.optionB : "";
  if (!question.trim() || !optionA.trim() || !optionB.trim()) return null;
  const userId = typeof raw.userId === "string" ? raw.userId : undefined;
  const readMoreTextRaw =
    typeof c.readMoreText === "string"
      ? c.readMoreText
      : typeof (c as { reason?: unknown }).reason === "string"
        ? ((c as { reason: string }).reason as string)
        : undefined;
  return {
    patternType: (c.patternType as VoteCardData["patternType"]) ?? "yellow-loops",
    question,
    optionA,
    optionB,
    countA: typeof c.countA === "number" ? c.countA : 0,
    countB: typeof c.countB === "number" ? c.countB : 0,
    commentCount: typeof c.commentCount === "number" ? c.commentCount : 0,
    tags: Array.isArray(c.tags) ? (c.tags as string[]) : undefined,
    readMoreText: readMoreTextRaw,
    creator:
      c.creator && typeof c.creator === "object" && typeof (c.creator as { name: string }).name === "string"
        ? (c.creator as { name: string; iconUrl?: string })
        : undefined,
    bookmarked: typeof c.bookmarked === "boolean" ? c.bookmarked : undefined,
    createdAt: typeof c.createdAt === "string" ? c.createdAt : undefined,
    backgroundImageUrl: typeof c.backgroundImageUrl === "string" ? c.backgroundImageUrl : undefined,
    id: typeof c.id === "string" ? c.id : undefined,
    visibility: c.visibility === "private" ? "private" : "public",
    optionAImageUrl: typeof c.optionAImageUrl === "string" ? c.optionAImageUrl : undefined,
    optionBImageUrl: typeof c.optionBImageUrl === "string" ? c.optionBImageUrl : undefined,
    periodStart: typeof c.periodStart === "string" ? c.periodStart : undefined,
    periodEnd: typeof c.periodEnd === "string" ? c.periodEnd : undefined,
    createdByUserId: userId,
    commentsDisabled: c.commentsDisabled === true ? true : undefined,
  };
}

function mergeCommentsPreferNewest(
  prev: CardActivity["comments"] | undefined,
  next: CardActivity["comments"] | undefined
): CardActivity["comments"] {
  const p = Array.isArray(prev) ? prev : [];
  const n = Array.isArray(next) ? next : [];
  if (p.length === 0) return n;
  if (n.length === 0) return p;

  const byId = new Map<string, CardActivity["comments"][number]>();
  for (const c of p) {
    if (c && typeof c.id === "string") byId.set(c.id, c);
  }
  for (const c of n) {
    if (c && typeof c.id === "string") byId.set(c.id, c);
  }
  const merged = Array.from(byId.values());
  merged.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return merged;
}

function buildActivityFromApi(
  global: Record<string, { countA?: number; countB?: number; comments?: CardActivity["comments"] }>,
  userSelections: Record<string, unknown>
): Record<string, CardActivity> {
  const globalN = normalizeKeyedRows(global);
  const userN = normalizeKeyedRows(userSelections);
  const cardIds = new Set([...Object.keys(globalN), ...Object.keys(userN)]);
  const result: Record<string, CardActivity> = {};
  for (const id of cardIds) {
    const g = globalN[id];
    const raw = userN[id];
    let userSelectedOption: "A" | "B" | undefined;
    let userVotedAt: string | undefined;
    if (raw === "A" || raw === "B") {
      userSelectedOption = raw;
    } else if (raw && typeof raw === "object") {
      const o = raw as { userSelectedOption?: string; votedAt?: string };
      if (o.userSelectedOption === "A" || o.userSelectedOption === "B") {
        userSelectedOption = o.userSelectedOption;
      }
      if (typeof o.votedAt === "string" && o.votedAt) userVotedAt = o.votedAt;
    }
    result[id] = {
      countA: g && typeof g.countA === "number" ? g.countA : 0,
      countB: g && typeof g.countB === "number" ? g.countB : 0,
      comments: g && Array.isArray(g.comments) ? g.comments : [],
      userSelectedOption,
      userVotedAt,
    };
  }
  return result;
}

/** GET が POST 直後に古い userSelections を返すと投票済みが消えるため、サーバー優先だが欠けたら直前の React 状態を残す */
function mergeActivityFromApiFetch(
  prev: Record<string, CardActivity>,
  global: Record<string, { countA?: number; countB?: number; comments?: CardActivity["comments"] }>,
  userSelections: Record<string, unknown>
): Record<string, CardActivity> {
  const built = buildActivityFromApi(global, userSelections);
  const merged: Record<string, CardActivity> = {};
  const allIds = new Set([...Object.keys(built), ...Object.keys(prev)]);
  for (const cardId of allIds) {
    const b = built[cardId];
    const p = prev[cardId];
    if (b && p) {
      merged[cardId] = {
        ...b,
        // GETが古いcommentsを返しても、送信直後のローカル分が消えないようにマージする
        comments: mergeCommentsPreferNewest(p.comments, b.comments),
        userSelectedOption: b.userSelectedOption ?? p.userSelectedOption,
        userVotedAt: b.userVotedAt ?? p.userVotedAt,
      };
    } else if (b) {
      merged[cardId] = b;
    } else if (p) {
      merged[cardId] = p;
    }
  }
  return merged;
}

/** 作成者向け通知用（API から取得） */
export type VoteEvent = { cardId: string; date: string; option?: "A" | "B" };
export type BookmarkEvent = { cardId: string; date: string };

export interface SharedDataContextValue {
  /** タイムライン用：全ユーザーの作成VOTE（API 時は全員分・未設定時は localStorage の user1+user2） */
  createdVotesForTimeline: VoteCardData[];
  /** カードID → 活動（投票数・コメント・現在ユーザーの選択） */
  activity: Record<string, CardActivity>;
  /** 作成者向け通知：誰かが投票したカードのイベント一覧（API 時のみ） */
  voteEvents: VoteEvent[];
  /** 作成者向け通知：誰かがブックマークしたカードのイベント一覧（API 時のみ） */
  bookmarkEvents: BookmarkEvent[];
  /** 作成者向け：メンバー限定コレに誰かが初参加したイベント（API 時のみ） */
  memberJoinEvents: MemberJoinOwnerEvent[];
  /** true = KV 経由で他ユーザーと共有中 */
  isRemote: boolean;
  /** 作成VOTEを追加（API 時は POST してから再取得） */
  addCreatedVote: (card: VoteCardData) => Promise<void>;
  /** 投票（API 時は POST してから再取得） */
  addVote: (cardId: string, option: "A" | "B") => Promise<void>;
  /** コメント追加（API 時は POST してから再取得）。parentCommentId 指定時は返信として追加。commenterVoteOption はお知らせのA/Bバッジ用 */
  addComment: (
    cardId: string,
    comment: { user: { name: string; iconUrl?: string }; text: string },
    parentCommentId?: string,
    commenterVoteOption?: "A" | "B",
    collectionId?: string
  ) => Promise<void>;
  /** 自分のコメント／リプライのみ削除（KV 時は API 経由） */
  removeComment: (
    cardId: string,
    commentId: string,
    currentCard?: Pick<CardActivity, "countA" | "countB" | "comments">
  ) => Promise<boolean>;
  /** ブックマークしたときに API に記録（作成者向け通知用・isRemote 時のみ） */
  recordBookmarkEvent: (cardId: string) => Promise<void>;
  /** 作成VOTEを一覧から除外（mypageの×削除でUI即時反映用） */
  removeCreatedVote: (cardId: string) => void;
  /** 初回の作成VOTE/活動取得が完了したか（HOMEの投票済みスナップショット用） */
  activityBootstrapDone: boolean;
  /** KV 活動・作成者向けイベントを再取得（通知画面の最新化用） */
  refetchActivity: () => Promise<boolean>;
  /** 作成VOTE一覧を KV から再取得（マイページ削除後の同期用） */
  refetchCreatedVotes: () => Promise<boolean>;
}

const SharedDataContext = createContext<SharedDataContextValue | null>(null);

export function useSharedData(): SharedDataContextValue {
  const ctx = useContext(SharedDataContext);
  if (!ctx) {
    return {
      createdVotesForTimeline: typeof window !== "undefined" ? getCreatedVotesForTimeline() : [],
      activity: typeof window !== "undefined" ? getAllActivity() : {},
      voteEvents: [],
      bookmarkEvents: [],
      memberJoinEvents: [],
      isRemote: false,
      addCreatedVote: async (card) => {
        if (typeof window === "undefined") return;
        addCreatedVoteLocal(card);
      },
      addVote: async (cardId, option) => {
        if (typeof window === "undefined") return;
        addVoteLocal(cardId, option);
      },
      addComment: async (
        _cardId: string,
        _comment: { user: { name: string; iconUrl?: string }; text: string },
        _parentCommentId?: string,
        _commenterVoteOption?: "A" | "B"
      ) => {},
      removeComment: async () => false,
      recordBookmarkEvent: async () => {},
      removeCreatedVote: () => {},
      activityBootstrapDone: true,
      refetchActivity: async () => false,
      refetchCreatedVotes: async () => false,
    };
  }
  return ctx;
}

export function SharedDataProvider({ children }: { children: ReactNode }) {
  /** fetchActivity のマージは同一 userId のときのみ（アカウント切替で前ユーザーの投票済みが残らないように） */
  const lastActivityFetchUserIdRef = useRef<string>("");
  const [createdVotesForTimeline, setCreatedVotesForTimeline] = useState<VoteCardData[]>(() =>
    typeof window !== "undefined" ? getCreatedVotesForTimeline() : []
  );
  const [activity, setActivity] = useState<Record<string, CardActivity>>(() =>
    typeof window !== "undefined" ? getAllActivity() : {}
  );
  const [voteEvents, setVoteEvents] = useState<VoteEvent[]>([]);
  const [bookmarkEvents, setBookmarkEvents] = useState<BookmarkEvent[]>([]);
  const [memberJoinEvents, setMemberJoinEvents] = useState<MemberJoinOwnerEvent[]>([]);
  const [isRemote, setIsRemote] = useState(false);
  const [activityBootstrapDone, setActivityBootstrapDone] = useState(false);
  const isRemoteRef = useRef(false);
  isRemoteRef.current = isRemote;

  /** 認証イベントが短時間に複数飛ぶとき activity GET を1回にまとめる（同一ユーザー時のみ） */
  const authActivityTimerRef = useRef<number | null>(null);
  const lastAuthActivityUserIdRef = useRef<string | null>(null);

  /** addVote / addComment の依存から外し、タイムライン更新のたびに子の onVote が変わらないようにする */
  const createdVotesForTimelineRef = useRef(createdVotesForTimeline);
  createdVotesForTimelineRef.current = createdVotesForTimeline;

  const fetchCreatedVotes = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(CREATED_VOTES_API);
      if (res.status !== 200) return false;
      const list = (await res.json()) as Array<{ userId?: string; card?: unknown }>;
      if (!Array.isArray(list)) return false;
      const cards: VoteCardData[] = [];
      for (const item of list) {
        const card = normalizeCardFromApi(item);
        if (card) cards.push(card);
      }
      setCreatedVotesForTimeline(cards);
      return true;
    } catch {
      return false;
    }
  }, []);

  const fetchActivity = useCallback(async (): Promise<boolean> => {
    const userId = getCurrentActivityUserId();
    try {
      const res = await fetch(`${ACTIVITY_API}?userId=${encodeURIComponent(userId)}`);
      if (res.status !== 200) return false;
      const data = (await res.json()) as {
        global?: Record<string, { countA?: number; countB?: number; comments?: CardActivity["comments"] }>;
        userSelections?: Record<string, unknown>;
        voteEvents?: VoteEvent[];
        bookmarkEvents?: BookmarkEvent[];
        memberJoinEvents?: MemberJoinOwnerEvent[];
      };
      const global = data?.global && typeof data.global === "object" ? data.global : {};
      const userSelections: Record<string, unknown> =
        data?.userSelections && typeof data.userSelections === "object" && data.userSelections !== null
          ? (data.userSelections as Record<string, unknown>)
          : {};
      setActivity((prev) => {
        if (lastActivityFetchUserIdRef.current !== userId) {
          lastActivityFetchUserIdRef.current = userId;
          return buildActivityFromApi(global, userSelections);
        }
        return mergeActivityFromApiFetch(prev, global, userSelections);
      });
      setVoteEvents(Array.isArray(data?.voteEvents) ? data.voteEvents : []);
      setBookmarkEvents(Array.isArray(data?.bookmarkEvents) ? data.bookmarkEvents : []);
      setMemberJoinEvents(Array.isArray(data?.memberJoinEvents) ? data.memberJoinEvents : []);
      return true;
    } catch {
      return false;
    }
  }, []);

  /** ハイドレーション直後に React の activity が空のまま固まるのを防ぐ（localStorage を即同期） */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setActivity(getAllActivity());
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [createdOk, activityOk] = await Promise.all([fetchCreatedVotes(), fetchActivity()]);
        if (mounted && createdOk && activityOk) setIsRemote(true);
      } finally {
        if (mounted) setActivityBootstrapDone(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchCreatedVotes, fetchActivity]);

  useEffect(() => {
    const DEBOUNCE_MS = 280;
    lastAuthActivityUserIdRef.current = getCurrentActivityUserId();

    const scheduleDebouncedFetch = () => {
      if (authActivityTimerRef.current != null) {
        clearTimeout(authActivityTimerRef.current);
      }
      authActivityTimerRef.current = window.setTimeout(() => {
        authActivityTimerRef.current = null;
        void fetchActivity();
      }, DEBOUNCE_MS);
    };

    const onAuthUpdated = () => {
      const uid = getCurrentActivityUserId();
      if (lastAuthActivityUserIdRef.current !== uid) {
        lastAuthActivityUserIdRef.current = uid;
        if (authActivityTimerRef.current != null) {
          clearTimeout(authActivityTimerRef.current);
          authActivityTimerRef.current = null;
        }
        void fetchActivity();
        return;
      }
      scheduleDebouncedFetch();
    };

    window.addEventListener(getAuthUpdatedEventName(), onAuthUpdated);
    return () => {
      window.removeEventListener(getAuthUpdatedEventName(), onAuthUpdated);
      if (authActivityTimerRef.current != null) {
        clearTimeout(authActivityTimerRef.current);
        authActivityTimerRef.current = null;
      }
    };
  }, [fetchActivity]);

  // ログイン後: コレクション作成分と参加分はどちらも localStorage を読み書きするため直列にする。
  // 並列だと Safari 等で完了順がずれ、古い load() 結果で save が上書きし一覧が空になる競合が起き得る。
  useEffect(() => {
    const hydrateAllFromRemote = () => {
      void (async () => {
        await hydrateUserOwnedCollectionsFromRemote();
        await hydrateParticipatedMemberCollectionsFromRemote();
        await hydrateBookmarksFromRemote();
      })();
    };
    hydrateAllFromRemote();
    window.addEventListener(getAuthUpdatedEventName(), hydrateAllFromRemote);
    return () => window.removeEventListener(getAuthUpdatedEventName(), hydrateAllFromRemote);
  }, []);

  // いいねなどで global だけ更新されたとき、既存の activity を上書きせずマージする（API取得分が消えないように）
  useEffect(() => {
    const handler = () => {
      const next = getAllActivity();
      setActivity((prev) => {
        const merged: Record<string, CardActivity> = { ...prev };
        for (const [cardId, a] of Object.entries(next)) {
          const p = prev[cardId];
          merged[cardId] = {
            ...(p ?? a),
            ...a,
            // remote(KV) の userSelectedOption を localStorage(=undefined) で上書きしない
            userSelectedOption: p?.userSelectedOption ?? a.userSelectedOption,
            userVotedAt: a.userVotedAt ?? p?.userVotedAt,
          };
        }
        return merged;
      });
    };
    window.addEventListener(ACTIVITY_GLOBAL_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ACTIVITY_GLOBAL_UPDATED_EVENT, handler);
  }, []);

  /** キャッシュクリア後などで bfcache から復元されたとき、localStorage が空なのに古いログイン状態が残るのを防ぐ */
  useEffect(() => {
    const syncAuth = () => {
      window.dispatchEvent(new CustomEvent(getAuthUpdatedEventName()));
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) syncAuth();
    };
    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") syncAuth();
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const name = getCreatedVotesUpdatedEventName();
    const handler = () => {
      if (isRemoteRef.current) {
        void fetchCreatedVotes();
      } else {
        setCreatedVotesForTimeline(getCreatedVotesForTimeline());
      }
    };
    window.addEventListener(name, handler);
    return () => window.removeEventListener(name, handler);
  }, [fetchCreatedVotes]);

  const addCreatedVote = useCallback(
    async (card: VoteCardData) => {
      const userId = getCurrentActivityUserId();
      if (isRemote) {
        const cardWithMeta: VoteCardData = {
          ...card,
          id: card.id ?? `created-${Date.now()}`,
          createdAt: card.createdAt ?? new Date().toISOString(),
          createdByUserId: userId,
        };
        setCreatedVotesForTimeline((prev) => [cardWithMeta, ...prev]);
        try {
          const res = await fetch(CREATED_VOTES_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, card: cardWithMeta }),
          });
          if (!res.ok) {
            const id = cardWithMeta.id ?? "";
            setCreatedVotesForTimeline((prev) => prev.filter((c) => (c.id ?? "") !== id));
            let message = "サーバーへの保存に失敗しました。";
            try {
              const data = (await res.json()) as { error?: string };
              if (typeof data?.error === "string" && data.error.length > 0) {
                message = data.error;
              }
            } catch {
              /* ignore */
            }
            throw new Error(message);
          }
          void fetchCreatedVotes();
        } catch (e) {
          const id = cardWithMeta.id ?? "";
          setCreatedVotesForTimeline((prev) => prev.filter((c) => (c.id ?? "") !== id));
          throw e;
        }
        return;
      }
      addCreatedVoteLocal(card);
      setCreatedVotesForTimeline(getCreatedVotesForTimeline());
    },
    [isRemote, fetchCreatedVotes]
  );

  const addVote = useCallback(
    async (cardId: string, option: "A" | "B") => {
      const userId = getCurrentActivityUserId();
      const timeline = isRemote
        ? createdVotesForTimelineRef.current
        : getCreatedVotesForTimeline();
      const meta = resolveCardForVotePeriod(cardId, timeline);
      if (meta && !isVotingAllowedNow(meta.periodStart, meta.periodEnd)) {
        return;
      }
      if (isRemote) {
        // 体感改善：POST/再取得を待たずに「投票済み」+ 票数を即反映（結果表示・コメント導線の遅延を防ぐ）
        const votedAt = new Date().toISOString();
        setActivity((prev) => ({
          ...prev,
          [cardId]: {
            ...(prev[cardId] ?? { countA: 0, countB: 0, comments: [] }),
            countA: (prev[cardId]?.countA ?? 0) + (option === "A" ? 1 : 0),
            countB: (prev[cardId]?.countB ?? 0) + (option === "B" ? 1 : 0),
            userSelectedOption: option,
            userVotedAt: votedAt,
          },
        }));
        const res = await fetch(ACTIVITY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "vote", userId, cardId, option }),
        });
        if (res.ok) {
          // カウント/コメントを最新化（楽観表示済みのためブロックしない）
          void fetchActivity();
        } else {
          // 失敗時は楽観更新を戻す（投票済みの誤表示を避ける）
          setActivity((prev) => {
            const cur = prev[cardId];
            if (!cur) return prev;
            const next = { ...prev };
            next[cardId] = {
              ...cur,
              countA: Math.max(0, (cur.countA ?? 0) - (option === "A" ? 1 : 0)),
              countB: Math.max(0, (cur.countB ?? 0) - (option === "B" ? 1 : 0)),
              userSelectedOption: undefined,
              userVotedAt: undefined,
            };
            return next;
          });
        }
        return;
      }
      addVoteLocal(cardId, option);
      setActivity((prev) => ({ ...prev, ...getAllActivity() }));
    },
    [isRemote, fetchActivity]
  );

  const addComment = useCallback(
    async (
      cardId: string,
      comment: { user: { name: string; iconUrl?: string }; text: string },
      parentCommentId?: string,
      commenterVoteOption?: "A" | "B",
      collectionId?: string
    ) => {
      const timeline = isRemote
        ? createdVotesForTimelineRef.current
        : getCreatedVotesForTimeline();
      if (isCommentsDisabledOnCard(cardId, timeline)) {
        return;
      }
      if (isRemote) {
        const authorUserId = getCurrentActivityUserId();
        // 体感改善：送信後に即表示（POST/再取得待ちの遅延をなくす）
        const optimisticId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const now = new Date().toISOString();
        setActivity((prev) => {
          const cur = prev[cardId] ?? { countA: 0, countB: 0, comments: [] as CardActivity["comments"] };
          const nextComments = Array.isArray(cur.comments) ? cur.comments : [];
          return {
            ...prev,
            [cardId]: {
              ...cur,
              comments: [
                ...nextComments,
                {
                  id: optimisticId,
                  userId: authorUserId,
                  user: comment.user,
                  text: comment.text,
                  date: now,
                  parentId: parentCommentId,
                  userVoteOption: commenterVoteOption,
                  ...(typeof collectionId === "string" && collectionId.length > 0 ? { collectionId } : {}),
                },
              ],
            },
          };
        });
        const res = await fetch(ACTIVITY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "comment",
            userId: authorUserId,
            cardId,
            comment,
            parentCommentId,
            commenterVoteOption,
            ...(typeof collectionId === "string" && collectionId.length > 0 ? { collectionId } : {}),
          }),
        });
        if (res.ok) {
          void fetchActivity();
        } else {
          // 失敗時は追加した分だけ取り消し（楽観コメントの残存を避ける）
          setActivity((prev) => {
            const cur = prev[cardId];
            if (!cur) return prev;
            const next = { ...prev };
            next[cardId] = {
              ...cur,
              comments: (cur.comments ?? []).filter((c) => c.id !== optimisticId),
            };
            return next;
          });
        }
        return;
      }
      addCommentLocal(cardId, comment, parentCommentId, commenterVoteOption, collectionId);
      setActivity((prev) => ({ ...prev, ...getAllActivity() }));
    },
    [isRemote, fetchActivity]
  );

  const removeComment = useCallback(
    async (
      cardId: string,
      commentId: string,
      currentCard?: Pick<CardActivity, "countA" | "countB" | "comments">
    ) => {
      if (isRemote) {
        const auth = getAuth();
        const authorName =
          auth.isLoggedIn && typeof auth.user?.name === "string" && auth.user.name.trim()
            ? auth.user.name.trim()
            : "自分";
        const res = await fetch(ACTIVITY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "delete_comment", cardId, commentId, authorName }),
        });
        if (res.ok) await fetchActivity();
        return res.ok;
      }
      const ok = removeCommentLocal(cardId, commentId, currentCard);
      if (ok) setActivity((prev) => ({ ...prev, ...getAllActivity() }));
      return ok;
    },
    [isRemote, fetchActivity]
  );

  const recordBookmarkEvent = useCallback(
    async (cardId: string) => {
      if (!isRemote) return;
      try {
        const res = await fetch(ACTIVITY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "bookmark", cardId }),
        });
        if (res.ok) void fetchActivity();
      } catch {
        // ignore
      }
    },
    [isRemote, fetchActivity]
  );

  const removeCreatedVote = useCallback((cardId: string) => {
    setCreatedVotesForTimeline((prev) =>
      prev.filter((c) => resolveStableVoteCardId(c) !== cardId)
    );
  }, []);

  const value = useMemo<SharedDataContextValue>(
    () => ({
      createdVotesForTimeline,
      activity,
      voteEvents,
      bookmarkEvents,
      memberJoinEvents,
      isRemote,
      addCreatedVote,
      addVote,
      addComment,
      removeComment,
      recordBookmarkEvent,
      removeCreatedVote,
      activityBootstrapDone,
      refetchActivity: fetchActivity,
      refetchCreatedVotes: fetchCreatedVotes,
    }),
    [
      createdVotesForTimeline,
      activity,
      voteEvents,
      bookmarkEvents,
      memberJoinEvents,
      isRemote,
      addCreatedVote,
      addVote,
      addComment,
      removeComment,
      recordBookmarkEvent,
      removeCreatedVote,
      activityBootstrapDone,
      fetchActivity,
      fetchCreatedVotes,
    ]
  );

  return (
    <SharedDataContext.Provider value={value}>
      {children}
    </SharedDataContext.Provider>
  );
}
