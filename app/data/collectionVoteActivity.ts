/**
 * メンバー限定コレクション内の投票のみを集計する（全体の vote_card_activity とは別）。
 * KV 設定時は /api/collection/[id]/votes で他ユーザーと共有、未設定時は localStorage のみ。
 */

import { getAuth, getCurrentActivityUserId } from "./auth";
import type { CardActivity } from "./voteCardActivity";

const VOTES_API = (collectionId: string) =>
  `/api/collection/${encodeURIComponent(collectionId)}/votes`;

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

export type UserSelectionRow = { userSelectedOption?: "A" | "B"; votedAt?: string };

/** API GET/POST のレスポンスをそのまま保存できる形 */
export type MemberCollectionVotesSnapshot = {
  global: Record<string, GlobalRow>;
  userSelections: Record<string, UserSelectionRow>;
  participants: Record<string, Omit<CollectionScopedParticipant, "userId">>;
};

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

function normalizeSnapshot(raw: unknown): MemberCollectionVotesSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const globalIn = o.global;
  const userIn = o.userSelections;
  const partsIn = o.participants;
  const global: Record<string, GlobalRow> = {};
  if (globalIn && typeof globalIn === "object") {
    for (const [cardId, v] of Object.entries(globalIn as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const g = v as Record<string, unknown>;
      const countA = typeof g.countA === "number" && g.countA >= 0 ? g.countA : 0;
      const countB = typeof g.countB === "number" && g.countB >= 0 ? g.countB : 0;
      global[cardId] = { countA, countB };
    }
  }
  const userSelections: Record<string, UserSelectionRow> = {};
  if (userIn && typeof userIn === "object") {
    for (const [cardId, v] of Object.entries(userIn as Record<string, unknown>)) {
      if (typeof v === "string" && (v === "A" || v === "B")) {
        userSelections[cardId] = { userSelectedOption: v };
        continue;
      }
      if (v && typeof v === "object") {
        const u = v as Record<string, unknown>;
        const opt = u.userSelectedOption === "A" || u.userSelectedOption === "B" ? u.userSelectedOption : undefined;
        const votedAt = typeof u.votedAt === "string" ? u.votedAt : undefined;
        if (opt || votedAt) userSelections[cardId] = { userSelectedOption: opt, votedAt };
      }
    }
  }
  const participants: Record<string, Omit<CollectionScopedParticipant, "userId">> = {};
  if (partsIn && typeof partsIn === "object") {
    for (const [uid, v] of Object.entries(partsIn as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const p = v as Record<string, unknown>;
      const name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : "ゲスト";
      const iconUrl = typeof p.iconUrl === "string" && p.iconUrl.length > 0 ? p.iconUrl : undefined;
      const lastVotedAt = typeof p.lastVotedAt === "string" ? p.lastVotedAt : new Date(0).toISOString();
      participants[uid] = { name, iconUrl, lastVotedAt };
    }
  }
  return { global, userSelections, participants };
}

/** KV から取得した内容で localStorage を上書き（他ユーザー分の集計を反映） */
export function hydrateCollectionScopedFromSnapshot(collectionId: string, snap: MemberCollectionVotesSnapshot): void {
  saveScopedGlobal(collectionId, snap.global);
  saveScopedUserSelections(collectionId, snap.userSelections);
  saveParticipantsMap(collectionId, snap.participants);
  notifyCollectionScopedUpdated(collectionId);
}

/** KV にメンバー限定コレクションがある場合に true（404/503 は false） */
export async function fetchMemberCollectionVotesRemote(
  collectionId: string
): Promise<{ ok: true; snapshot: MemberCollectionVotesSnapshot } | { ok: false; reason: "not_found" | "no_kv" | "error" }> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "error" };
  }
  const userId = getCurrentActivityUserId();
  try {
    const res = await fetch(`${VOTES_API(collectionId)}?userId=${encodeURIComponent(userId)}`);
    if (res.status === 503) return { ok: false, reason: "no_kv" };
    if (res.status === 404) return { ok: false, reason: "not_found" };
    if (!res.ok) return { ok: false, reason: "error" };
    const snap = normalizeSnapshot(await res.json());
    if (!snap) return { ok: false, reason: "error" };
    return { ok: true, snapshot: snap };
  } catch {
    return { ok: false, reason: "error" };
  }
}

function buildParticipantPayload(): { name: string; iconUrl?: string } {
  const auth = getAuth();
  const name =
    auth.isLoggedIn && typeof auth.user?.name === "string" && auth.user.name.trim()
      ? auth.user.name.trim()
      : "ゲスト";
  const iconUrl =
    auth.isLoggedIn && typeof auth.user?.iconUrl === "string" && auth.user.iconUrl.length > 0
      ? auth.user.iconUrl
      : undefined;
  return iconUrl ? { name, iconUrl } : { name };
}

function applyLocalCollectionScopedVoteOnly(collectionId: string, cardId: string, option: "A" | "B"): void {
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
 * `useKv` true のときは KV API に送り、成功後に localStorage をサーバー状態で上書きする。
 */
export function addCollectionScopedVote(
  collectionId: string,
  cardId: string,
  option: "A" | "B",
  opts?: { useKv?: boolean }
): void {
  applyLocalCollectionScopedVoteOnly(collectionId, cardId, option);

  if (!opts?.useKv) return;

  void (async () => {
    try {
      const res = await fetch(VOTES_API(collectionId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getCurrentActivityUserId(),
          cardId,
          option,
          participant: buildParticipantPayload(),
        }),
      });
      if (!res.ok) return;
      const snap = normalizeSnapshot(await res.json());
      if (snap) hydrateCollectionScopedFromSnapshot(collectionId, snap);
    } catch {
      // ローカルは既に apply済み。API 失敗時はこの端末のみの集計のまま。
    }
  })();
}
