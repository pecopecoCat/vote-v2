import type { KVClient } from "./kv";
import { readMemberJoinOwnerEvents, type MemberJoinOwnerEvent } from "./memberJoinOwnerNotifications";

export const KV_CREATED_VOTES = "vote_created_votes";
export const KV_ACTIVITY_GLOBAL = "vote_activity_global";
export const KV_ACTIVITY_USER_PREFIX = "vote_activity_user_";
export const KV_VOTE_EVENTS = "vote_activity_vote_events";
export const KV_BOOKMARK_EVENTS = "vote_activity_bookmark_events";

export type CreatedVoteEntry = { userId: string; card: Record<string, unknown> };

/** クライアントの voteCardActivity の GlobalCardData と同じ形（activity API と揃える） */
export type GlobalCardData = {
  countA: number;
  countB: number;
  comments: Array<{
    id: string;
    userId?: string;
    user: { name: string; iconUrl?: string };
    collectionId?: string;
    date: string;
    text: string;
    likeCount?: number;
    parentId?: string;
    replyCount?: number;
    userVoteOption?: "A" | "B";
  }>;
};

export type VoteEvent = { cardId: string; date: string; option?: "A" | "B" };
export type BookmarkEvent = { cardId: string; date: string };

export type ActivityGetPayload = {
  global: Record<string, GlobalCardData>;
  userSelections: Record<string, { userSelectedOption?: "A" | "B"; votedAt?: string }>;
  voteEvents: VoteEvent[];
  bookmarkEvents: BookmarkEvent[];
  memberJoinEvents: MemberJoinOwnerEvent[];
};

export async function readCreatedVotesList(kv: KVClient): Promise<CreatedVoteEntry[]> {
  const raw = await kv.get<CreatedVoteEntry[]>(KV_CREATED_VOTES);
  return Array.isArray(raw) ? raw : [];
}

export async function readActivityGetPayload(kv: KVClient, userId: string): Promise<ActivityGetPayload> {
  const [global, userRaw, voteEvents, bookmarkEvents, memberJoinEvents] = await Promise.all([
    kv.get<Record<string, GlobalCardData>>(KV_ACTIVITY_GLOBAL),
    userId ? kv.get<Record<string, { userSelectedOption?: "A" | "B"; votedAt?: string }>>(KV_ACTIVITY_USER_PREFIX + userId) : null,
    kv.get<VoteEvent[]>(KV_VOTE_EVENTS),
    kv.get<BookmarkEvent[]>(KV_BOOKMARK_EVENTS),
    userId ? readMemberJoinOwnerEvents(kv, userId) : Promise.resolve([] as MemberJoinOwnerEvent[]),
  ]);
  const globalData = global && typeof global === "object" ? global : {};
  const userSelections: Record<string, { userSelectedOption?: "A" | "B"; votedAt?: string }> = {};
  if (userRaw && typeof userRaw === "object") {
    type UserSelection = { userSelectedOption?: "A" | "B"; votedAt?: string };
    for (const [cardId, v] of Object.entries(userRaw) as [string, UserSelection][]) {
      if (v?.userSelectedOption === "A" || v?.userSelectedOption === "B") {
        userSelections[cardId] = {
          userSelectedOption: v.userSelectedOption,
          ...(typeof v.votedAt === "string" ? { votedAt: v.votedAt } : {}),
        };
      }
    }
  }
  const voteList = Array.isArray(voteEvents) ? voteEvents : [];
  const bookmarkList = Array.isArray(bookmarkEvents) ? bookmarkEvents : [];
  return {
    global: globalData,
    userSelections,
    voteEvents: voteList,
    bookmarkEvents: bookmarkList,
    memberJoinEvents: Array.isArray(memberJoinEvents) ? memberJoinEvents : [],
  };
}
