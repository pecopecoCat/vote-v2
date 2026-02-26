"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

export interface SharedDataContextValue {
  /** タイムライン用：全ユーザーの作成VOTE（API 時は全員分・未設定時は localStorage の user1+user2） */
  createdVotesForTimeline: VoteCardData[];
  /** カードID → 活動（投票数・コメント・現在ユーザーの選択） */
  activity: Record<string, CardActivity>;
  /** true = KV 経由で他ユーザーと共有中 */
  isRemote: boolean;
  /** 作成VOTEを追加（API 時は POST してから再取得） */
  addCreatedVote: (card: VoteCardData) => Promise<void>;
  /** 投票（API 時は POST してから再取得） */
  addVote: (cardId: string, option: "A" | "B") => Promise<void>;
  /** コメント追加（API 時は POST してから再取得） */
  addComment: (
    cardId: string,
    comment: { user: { name: string; iconUrl?: string }; text: string }
  ) => Promise<void>;
}

const SharedDataContext = createContext<SharedDataContextValue | null>(null);

export function useSharedData(): SharedDataContextValue {
  const ctx = useContext(SharedDataContext);
  if (!ctx) {
    return {
      createdVotesForTimeline: typeof window !== "undefined" ? getCreatedVotesForTimeline() : [],
      activity: typeof window !== "undefined" ? getAllActivity() : {},
      isRemote: false,
      addCreatedVote: async (card) => {
        if (typeof window === "undefined") return;
        addCreatedVoteLocal(card);
      },
      addVote: async (cardId, option) => {
        if (typeof window === "undefined") return;
        addVoteLocal(cardId, option);
      },
      addComment: async () => {},
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
  const [isRemote, setIsRemote] = useState(false);

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
      };
      const global = data?.global && typeof data.global === "object" ? data.global : {};
      const userSelections = data?.userSelections && typeof data.userSelections === "object" ? data.userSelections : {};
      setActivity(buildActivityFromApi(global, userSelections));
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [createdOk, activityOk] = await Promise.all([fetchCreatedVotes(), fetchActivity()]);
      if (mounted && createdOk && activityOk) setIsRemote(true);
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

  useEffect(() => {
    if (isRemote) return;
    const name = getCreatedVotesUpdatedEventName();
    const handler = () => setCreatedVotesForTimeline(getCreatedVotesForTimeline());
    window.addEventListener(name, handler);
    return () => window.removeEventListener(name, handler);
  }, [isRemote]);

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
      setActivity(getAllActivity());
    },
    [isRemote, fetchActivity]
  );

  const addComment = useCallback(
    async (
      cardId: string,
      comment: { user: { name: string; iconUrl?: string }; text: string }
    ) => {
      if (isRemote) {
        const res = await fetch(ACTIVITY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "comment", cardId, comment }),
        });
        if (res.ok) await fetchActivity();
        return;
      }
      addCommentLocal(cardId, comment);
      setActivity(getAllActivity());
    },
    [isRemote, fetchActivity]
  );

  const value: SharedDataContextValue = {
    createdVotesForTimeline,
    activity,
    isRemote,
    addCreatedVote,
    addVote,
    addComment,
  };

  return (
    <SharedDataContext.Provider value={value}>
      {children}
    </SharedDataContext.Provider>
  );
}
