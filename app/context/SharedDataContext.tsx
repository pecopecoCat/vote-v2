"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import type { VoteCardData } from "../data/voteCards";
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
  ACTIVITY_GLOBAL_UPDATED_EVENT,
} from "../data/voteCardActivity";
import { getCurrentActivityUserId, getAuthUpdatedEventName } from "../data/auth";

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
  return {
    patternType: (c.patternType as VoteCardData["patternType"]) ?? "yellow-loops",
    question,
    optionA,
    optionB,
    countA: typeof c.countA === "number" ? c.countA : 0,
    countB: typeof c.countB === "number" ? c.countB : 0,
    commentCount: typeof c.commentCount === "number" ? c.commentCount : 0,
    tags: Array.isArray(c.tags) ? (c.tags as string[]) : undefined,
    readMoreText: typeof c.readMoreText === "string" ? c.readMoreText : undefined,
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
    periodEnd: typeof c.periodEnd === "string" ? c.periodEnd : undefined,
    createdByUserId: userId,
  };
}

function buildActivityFromApi(
  global: Record<string, { countA?: number; countB?: number; comments?: CardActivity["comments"] }>,
  userSelections: Record<string, "A" | "B">
): Record<string, CardActivity> {
  const cardIds = new Set([...Object.keys(global), ...Object.keys(userSelections)]);
  const result: Record<string, CardActivity> = {};
  for (const id of cardIds) {
    const g = global[id];
    const u = userSelections[id];
    result[id] = {
      countA: g && typeof g.countA === "number" ? g.countA : 0,
      countB: g && typeof g.countB === "number" ? g.countB : 0,
      comments: g && Array.isArray(g.comments) ? g.comments : [],
      userSelectedOption: u ?? undefined,
    };
  }
  return result;
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
    commenterVoteOption?: "A" | "B"
  ) => Promise<void>;
  /** ブックマークしたときに API に記録（作成者向け通知用・isRemote 時のみ） */
  recordBookmarkEvent: (cardId: string) => Promise<void>;
  /** 作成VOTEを一覧から除外（mypageの×削除でUI即時反映用） */
  removeCreatedVote: (cardId: string) => void;
  /** 初回の作成VOTE/活動取得が完了したか（HOMEの投票済みスナップショット用） */
  activityBootstrapDone: boolean;
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
      recordBookmarkEvent: async () => {},
      removeCreatedVote: () => {},
      activityBootstrapDone: true,
    };
  }
  return ctx;
}

export function SharedDataProvider({ children }: { children: ReactNode }) {
  const [createdVotesForTimeline, setCreatedVotesForTimeline] = useState<VoteCardData[]>(() =>
    typeof window !== "undefined" ? getCreatedVotesForTimeline() : []
  );
  const [activity, setActivity] = useState<Record<string, CardActivity>>(() =>
    typeof window !== "undefined" ? getAllActivity() : {}
  );
  const [voteEvents, setVoteEvents] = useState<VoteEvent[]>([]);
  const [bookmarkEvents, setBookmarkEvents] = useState<BookmarkEvent[]>([]);
  const [isRemote, setIsRemote] = useState(false);
  const [activityBootstrapDone, setActivityBootstrapDone] = useState(false);

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
        userSelections?: Record<string, "A" | "B">;
        voteEvents?: VoteEvent[];
        bookmarkEvents?: BookmarkEvent[];
      };
      const global = data?.global && typeof data.global === "object" ? data.global : {};
      const userSelections = data?.userSelections && typeof data.userSelections === "object" ? data.userSelections : {};
      setActivity(buildActivityFromApi(global, userSelections));
      setVoteEvents(Array.isArray(data?.voteEvents) ? data.voteEvents : []);
      setBookmarkEvents(Array.isArray(data?.bookmarkEvents) ? data.bookmarkEvents : []);
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
    const handler = () => fetchActivity();
    window.addEventListener(getAuthUpdatedEventName(), handler);
    return () => window.removeEventListener(getAuthUpdatedEventName(), handler);
  }, [fetchActivity]);

  // いいねなどで global だけ更新されたとき、既存の activity を上書きせずマージする（API取得分が消えないように）
  useEffect(() => {
    const handler = () => {
      setActivity((prev) => ({ ...prev, ...getAllActivity() }));
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
    const handler = () => setCreatedVotesForTimeline(getCreatedVotesForTimeline());
    window.addEventListener(name, handler);
    return () => window.removeEventListener(name, handler);
  }, []);

  const addCreatedVote = useCallback(
    async (card: VoteCardData) => {
      const userId = getCurrentActivityUserId();
      if (isRemote) {
        const res = await fetch(CREATED_VOTES_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, card }),
        });
        if (res.ok) await fetchCreatedVotes();
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
      if (isRemote) {
        const res = await fetch(ACTIVITY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "vote", userId, cardId, option }),
        });
        if (res.ok) await fetchActivity();
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
      commenterVoteOption?: "A" | "B"
    ) => {
      if (isRemote) {
        const res = await fetch(ACTIVITY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "comment",
            cardId,
            comment,
            parentCommentId,
            commenterVoteOption,
          }),
        });
        if (res.ok) await fetchActivity();
        return;
      }
      addCommentLocal(cardId, comment, parentCommentId, commenterVoteOption);
      setActivity((prev) => ({ ...prev, ...getAllActivity() }));
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
        if (res.ok) await fetchActivity();
      } catch {
        // ignore
      }
    },
    [isRemote, fetchActivity]
  );

  const removeCreatedVote = useCallback((cardId: string) => {
    setCreatedVotesForTimeline((prev) =>
      prev.filter((c) => (c.id ?? c.question) !== cardId)
    );
  }, []);

  const value: SharedDataContextValue = {
    createdVotesForTimeline,
    activity,
    voteEvents,
    bookmarkEvents,
    isRemote,
    addCreatedVote,
    addVote,
    addComment,
    recordBookmarkEvent,
    removeCreatedVote,
    activityBootstrapDone,
  };

  return (
    <SharedDataContext.Provider value={value}>
      {children}
    </SharedDataContext.Provider>
  );
}
