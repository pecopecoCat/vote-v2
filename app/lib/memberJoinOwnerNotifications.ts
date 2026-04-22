import type { KVClient } from "./kv";

/** 作成者向け：メンバー限定コレに誰かが初参加したときのお知らせ一覧（ユーザーごと） */
export const MEMBER_JOIN_OWNER_EVENTS_PREFIX = "vote_activity_member_join_events:";

const MAX_EVENTS = 200;

export type MemberJoinOwnerEvent = {
  at: string;
  actorUserId: string;
  actorName: string;
  actorIconUrl?: string;
  collectionId: string;
  collectionName: string;
};

function key(ownerUserId: string): string {
  return MEMBER_JOIN_OWNER_EVENTS_PREFIX + ownerUserId;
}

export async function appendMemberJoinOwnerEvent(
  kv: KVClient,
  ownerUserId: string,
  row: MemberJoinOwnerEvent
): Promise<void> {
  const k = key(ownerUserId);
  const cur = (await kv.get<MemberJoinOwnerEvent[]>(k)) ?? [];
  const list = Array.isArray(cur) ? cur : [];
  const next = [...list, row].slice(-MAX_EVENTS);
  await kv.set(k, next);
}

export async function readMemberJoinOwnerEvents(
  kv: KVClient,
  ownerUserId: string
): Promise<MemberJoinOwnerEvent[]> {
  const raw = await kv.get<unknown>(key(ownerUserId));
  return Array.isArray(raw) ? (raw as MemberJoinOwnerEvent[]) : [];
}
