/**
 * メンバー限定コレクション内の投票のみを集計する（全体の vote_card_activity とは別）。
 * 同一カードでも、コレクション画面ではここだけの票数・自分の選択を表示する。
 */

import { getAuth, getCurrentActivityUserId } from "./auth";
import type { CardActivity } from "./voteCardActivity";

const GLOBAL_KEY_PREFIX = "vote_collection_scoped_global_";
const USER_KEY_PREFIX = "vote_collection_scoped_user_";
const PARTICIPANTS_KEY_PREFIX = "vote_collection_scoped_participants_";

/** メンバー限定コレクション内で投票したユーザー（同一ブラウザで記録された分） */
export interface CollectionScopedParticipant {
  userId: string;
  name: string;
  iconUrl?: string;
  lastVotedAt: string;
}

export const COLLECTION_SCOPED_VOTES_UPDATED_EVENT = "vote_collection_scoped_votes_updated";

interface GlobalRow {
  countA: number;
  countB: number;
}

type UserSelectionRow = { userSelectedOption?: "A" | "B"; votedAt?: string };

function globalKey(collectionId: string): string {
  return GLOBAL_KEY_PREFIX + collectionId;
}

function userKey(collectionId: string): string {
  return USER_KEY_PREFIX + getCurrentActivityUserId() + "_" + collectionId;
}

function loadScopedGlobal(collectionId: string): Record<string, GlobalRow> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(globalKey(collectionId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, GlobalRow> = {};
    for (const [cardId, v] of Object.entries(parsed)) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const countA = typeof o.countA === "number" && o.countA >= 0 ? o.countA : 0;
      const countB = typeof o.countB === "number" && o.countB >= 0 ? o.countB : 0;
      out[cardId] = { countA, countB };
    }
    return out;
  } catch {
    return {};
  }
}

function saveScopedGlobal(collectionId: string, data: Record<string, GlobalRow>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(globalKey(collectionId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function loadScopedUserSelections(collectionId: string): Record<string, UserSelectionRow> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(userKey(collectionId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, UserSelectionRow> = {};
    for (const [cardId, v] of Object.entries(parsed)) {
      if (typeof v === "string" && (v === "A" || v === "B")) {
        out[cardId] = { userSelectedOption: v };
        continue;
      }
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        const opt = o.userSelectedOption === "A" || o.userSelectedOption === "B" ? o.userSelectedOption : undefined;
        const votedAt = typeof o.votedAt === "string" ? o.votedAt : undefined;
        if (opt || votedAt) out[cardId] = { userSelectedOption: opt, votedAt };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveScopedUserSelections(collectionId: string, data: Record<string, UserSelectionRow>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(userKey(collectionId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function notifyCollectionScopedUpdated(collectionId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COLLECTION_SCOPED_VOTES_UPDATED_EVENT, { detail: { collectionId } })
  );
}

function participantsKey(collectionId: string): string {
  return PARTICIPANTS_KEY_PREFIX + collectionId;
}

function loadParticipantsMap(collectionId: string): Record<string, Omit<CollectionScopedParticipant, "userId">> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(participantsKey(collectionId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, Omit<CollectionScopedParticipant, "userId">> = {};
    for (const [uid, v] of Object.entries(parsed)) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : "ゲスト";
      const iconUrl = typeof o.iconUrl === "string" && o.iconUrl.length > 0 ? o.iconUrl : undefined;
      const lastVotedAt = typeof o.lastVotedAt === "string" ? o.lastVotedAt : new Date(0).toISOString();
      out[uid] = { name, iconUrl, lastVotedAt };
    }
    return out;
  } catch {
    return {};
  }
}

function saveParticipantsMap(collectionId: string, data: Record<string, Omit<CollectionScopedParticipant, "userId">>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(participantsKey(collectionId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function upsertParticipantFromCurrentAuth(collectionId: string): void {
  const auth = getAuth();
  const userId = getCurrentActivityUserId();
  const name =
    auth.isLoggedIn && typeof auth.user?.name === "string" && auth.user.name.trim()
      ? auth.user.name.trim()
      : "ゲスト";
  const iconUrl =
    auth.isLoggedIn && typeof auth.user?.iconUrl === "string" && auth.user.iconUrl.length > 0
      ? auth.user.iconUrl
      : undefined;
  const lastVotedAt = new Date().toISOString();
  const map = loadParticipantsMap(collectionId);
  saveParticipantsMap(collectionId, {
    ...map,
    [userId]: { name, iconUrl, lastVotedAt },
  });
}

/** メンバー限定コレクションで投票したメンバー一覧（新しい投票順） */
export function getCollectionScopedParticipants(collectionId: string): CollectionScopedParticipant[] {
  const map = loadParticipantsMap(collectionId);
  const list: CollectionScopedParticipant[] = Object.entries(map).map(([userId, row]) => ({
    userId,
    name: row.name,
    iconUrl: row.iconUrl,
    lastVotedAt: row.lastVotedAt,
  }));
  list.sort((a, b) => (b.lastVotedAt || "").localeCompare(a.lastVotedAt || ""));
  return list;
}

/** コレクション内の票数＋現在ユーザーの選択（コメントは含めない。親でグローバルと合成する） */
export function getCollectionScopedActivity(collectionId: string, cardId: string): CardActivity {
  const g = loadScopedGlobal(collectionId)[cardId];
  const u = loadScopedUserSelections(collectionId)[cardId];
  return {
    countA: g?.countA ?? 0,
    countB: g?.countB ?? 0,
    comments: [],
    userSelectedOption: u?.userSelectedOption === "A" || u?.userSelectedOption === "B" ? u.userSelectedOption : undefined,
    userVotedAt: typeof u?.votedAt === "string" && u.votedAt ? u.votedAt : undefined,
  };
}

/** メンバー限定コレクション画面用：カードIDごとのスコープ活動（コメントなし） */
export function getAllCollectionScopedActivity(collectionId: string): Record<string, CardActivity> {
  const global = loadScopedGlobal(collectionId);
  const user = loadScopedUserSelections(collectionId);
  const ids = new Set([...Object.keys(global), ...Object.keys(user)]);
  const result: Record<string, CardActivity> = {};
  for (const id of ids) {
    result[id] = getCollectionScopedActivity(collectionId, id);
  }
  return result;
}

/**
 * メンバー限定コレクションで投票。全体の addVote は呼ばない（通知・HOME集計に影響しない）。
 */
export function addCollectionScopedVote(collectionId: string, cardId: string, option: "A" | "B"): void {
  const globalMap = loadScopedGlobal(collectionId);
  const current = globalMap[cardId] ?? { countA: 0, countB: 0 };
  const nextRow: GlobalRow = {
    countA: current.countA + (option === "A" ? 1 : 0),
    countB: current.countB + (option === "B" ? 1 : 0),
  };
  saveScopedGlobal(collectionId, { ...globalMap, [cardId]: nextRow });

  const user = loadScopedUserSelections(collectionId);
  const votedAt = new Date().toISOString();
  saveScopedUserSelections(collectionId, { ...user, [cardId]: { userSelectedOption: option, votedAt } });
  upsertParticipantFromCurrentAuth(collectionId);
  notifyCollectionScopedUpdated(collectionId);
}
