/**
 * メンバー限定コレクション内の投票のみを集計する（全体の vote_card_activity とは別）。
 * KV 設定時は /api/collection/[id]/votes で他ユーザーと共有、未設定時は localStorage のみ。
 */

import { DEMO_USER_IDS, getAuth, getCurrentActivityUserId, getDisplayUserForDemo, type DemoUserId } from "./auth";
import type { CardActivity } from "./voteCardActivity";
import { normalizeCardIdKey } from "../lib/normalize";

const VOTES_API = (collectionId: string) =>
  `/api/collection/${encodeURIComponent(collectionId)}/votes`;

/** メンバー限定の集計取得は GET /api/collection?userId=（memberVotes 同梱）を優先（作成者のローカル専用ルートと同じ応答に揃える） */
const COLLECTION_READ_API = (collectionId: string) =>
  `/api/collection/${encodeURIComponent(collectionId)}`;

const GLOBAL_KEY_PREFIX = "vote_collection_scoped_global_";
const USER_KEY_PREFIX = "vote_collection_scoped_user_";
const PARTICIPANTS_KEY_PREFIX = "vote_collection_scoped_participants_";
const JOIN_PROFILES_KEY_PREFIX = "vote_collection_scoped_join_prof_";
const MEMBER_IDS_KEY_PREFIX = "vote_collection_scoped_member_ids_";

/** メンバー限定コレクション内で投票したユーザー（同一ブラウザで記録された分） */
export interface CollectionScopedParticipant {
  userId: string;
  name: string;
  iconUrl?: string;
  lastVotedAt: string;
}

export const COLLECTION_SCOPED_VOTES_UPDATED_EVENT = "vote_collection_scoped_votes_updated";

/** ローカルに保存したメンバー限定コレクションの投票/参加者/参加プロフィールを全削除（参加解除・削除時用） */
export function clearCollectionScopedLocalData(collectionId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(globalKey(collectionId));
    window.localStorage.removeItem(userKey(collectionId));
    window.localStorage.removeItem(PARTICIPANTS_KEY_PREFIX + collectionId);
    window.localStorage.removeItem(JOIN_PROFILES_KEY_PREFIX + collectionId);
    window.localStorage.removeItem(MEMBER_IDS_KEY_PREFIX + collectionId);
  } catch {
    // ignore
  }
  notifyCollectionScopedUpdated(collectionId);
}

interface GlobalRow {
  countA: number;
  countB: number;
}

export type UserSelectionRow = { userSelectedOption?: "A" | "B"; votedAt?: string };

/** 参加APIでKVに保存したプロフィール（メンバー一覧に表示する） */
export type MemberCollectionJoinProfile = { name: string; iconUrl?: string; joinedAt: string };

/** API GET/POST のレスポンスをそのまま保存できる形 */
export type MemberCollectionVotesSnapshot = {
  global: Record<string, GlobalRow>;
  userSelections: Record<string, UserSelectionRow>;
  participants: Record<string, Omit<CollectionScopedParticipant, "userId">>;
  joinProfiles: Record<string, MemberCollectionJoinProfile>;
  /** 参加登録インデックス（KV）。クライアント表示の漏れ防止用 */
  memberUserIds?: string[];
};

function normalizeSnapshotKeys(snap: MemberCollectionVotesSnapshot): MemberCollectionVotesSnapshot {
  const global: Record<string, GlobalRow> = {};
  for (const [cid, row] of Object.entries(snap.global ?? {})) {
    global[normalizeCardIdKey(cid)] = row;
  }
  const userSelections: Record<string, UserSelectionRow> = {};
  for (const [cid, row] of Object.entries(snap.userSelections ?? {})) {
    userSelections[normalizeCardIdKey(cid)] = row;
  }
  return { ...snap, global, userSelections };
}

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

function joinProfilesKey(collectionId: string): string {
  return JOIN_PROFILES_KEY_PREFIX + collectionId;
}

function memberIdsKey(collectionId: string): string {
  return MEMBER_IDS_KEY_PREFIX + collectionId;
}

function loadMemberUserIds(collectionId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(memberIdsKey(collectionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return [];
  }
}

function saveMemberUserIds(collectionId: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(memberIdsKey(collectionId), JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/** デモ userId なら表示名を補完（KV に名前が無い古いデータ向け） */
function resolveMemberDisplayName(userId: string, fallback?: string): string {
  const trimmed = typeof fallback === "string" ? fallback.trim() : "";
  if (trimmed && trimmed !== "ゲスト" && trimmed !== userId) return trimmed;
  if ((DEMO_USER_IDS as readonly string[]).includes(userId)) {
    return getDisplayUserForDemo(userId as DemoUserId).name;
  }
  return trimmed || "メンバー";
}

function resolveMemberIconUrl(userId: string, fallback?: string): string | undefined {
  if (typeof fallback === "string" && fallback.length > 0) return fallback;
  if ((DEMO_USER_IDS as readonly string[]).includes(userId)) {
    return getDisplayUserForDemo(userId as DemoUserId).iconUrl;
  }
  return undefined;
}

function loadJoinProfilesMap(collectionId: string): Record<string, MemberCollectionJoinProfile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(joinProfilesKey(collectionId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, MemberCollectionJoinProfile> = {};
    for (const [uid, v] of Object.entries(parsed)) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : "ゲスト";
      const iconUrl = typeof o.iconUrl === "string" && o.iconUrl.length > 0 ? o.iconUrl : undefined;
      const joinedAt =
        typeof o.joinedAt === "string" && o.joinedAt.length > 0 ? o.joinedAt : new Date(0).toISOString();
      out[uid] = iconUrl ? { name, iconUrl, joinedAt } : { name, joinedAt };
    }
    return out;
  } catch {
    return {};
  }
}

function saveJoinProfilesMap(collectionId: string, data: Record<string, MemberCollectionJoinProfile>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(joinProfilesKey(collectionId), JSON.stringify(data));
  } catch {
    // ignore
  }
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

/** API（GET votes / collection 同梱 memberVotes）の JSON を検証してスナップショット化 */
export function parseMemberCollectionVotesPayload(raw: unknown): MemberCollectionVotesSnapshot | null {
  const snap = normalizeSnapshot(raw);
  return snap ? normalizeSnapshotKeys(snap) : null;
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
  const joinProfiles: Record<string, MemberCollectionJoinProfile> = {};
  const joinIn = o.joinProfiles;
  if (joinIn && typeof joinIn === "object") {
    for (const [uid, v] of Object.entries(joinIn as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const p = v as Record<string, unknown>;
      const name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : "ゲスト";
      const iconUrl = typeof p.iconUrl === "string" && p.iconUrl.length > 0 ? p.iconUrl : undefined;
      const joinedAt =
        typeof p.joinedAt === "string" && p.joinedAt.length > 0 ? p.joinedAt : new Date(0).toISOString();
      joinProfiles[uid] = iconUrl ? { name, iconUrl, joinedAt } : { name, joinedAt };
    }
  }
  const memberUserIds = Array.isArray(o.memberUserIds)
    ? o.memberUserIds.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
  return { global, userSelections, participants, joinProfiles, memberUserIds };
}

type ParticipantRow = Omit<CollectionScopedParticipant, "userId">;

/** ローカルとサーバーの参加者をマージ（GET が空や遅延でも直前の表示が消えない。同一 userId は lastVotedAt が新しい方を採用） */
function mergeParticipantRows(local: ParticipantRow, server: ParticipantRow): ParticipantRow {
  const lt = local.lastVotedAt ?? "";
  const st = server.lastVotedAt ?? "";
  if (st > lt) return { name: server.name, iconUrl: server.iconUrl, lastVotedAt: server.lastVotedAt };
  if (lt > st) return { name: local.name, iconUrl: local.iconUrl, lastVotedAt: local.lastVotedAt };
  return { name: server.name, iconUrl: server.iconUrl ?? local.iconUrl, lastVotedAt: st || lt };
}

function mergeParticipantsMaps(
  local: Record<string, ParticipantRow>,
  server: Record<string, ParticipantRow>
): Record<string, ParticipantRow> {
  const ids = new Set([...Object.keys(local), ...Object.keys(server)]);
  const out: Record<string, ParticipantRow> = {};
  for (const uid of ids) {
    const L = local[uid];
    const S = server[uid];
    if (L && S) out[uid] = mergeParticipantRows(L, S);
    else if (S) out[uid] = S;
    else if (L) out[uid] = L;
  }
  return out;
}

function mergeJoinProfileRows(a: MemberCollectionJoinProfile, b: MemberCollectionJoinProfile): MemberCollectionJoinProfile {
  const aj = a.joinedAt ?? "";
  const bj = b.joinedAt ?? "";
  if (bj >= aj) {
    return { name: b.name, iconUrl: b.iconUrl ?? a.iconUrl, joinedAt: b.joinedAt };
  }
  return { name: a.name, iconUrl: a.iconUrl ?? b.iconUrl, joinedAt: a.joinedAt };
}

function mergeJoinProfileMaps(
  local: Record<string, MemberCollectionJoinProfile>,
  server: Record<string, MemberCollectionJoinProfile>
): Record<string, MemberCollectionJoinProfile> {
  const ids = new Set([...Object.keys(local), ...Object.keys(server)]);
  const out: Record<string, MemberCollectionJoinProfile> = {};
  for (const uid of ids) {
    const L = local[uid];
    const S = server[uid];
    if (L && S) out[uid] = mergeJoinProfileRows(L, S);
    else if (S) out[uid] = S;
    else if (L) out[uid] = L;
  }
  return out;
}

/**
 * 参加者はサーバーが正（マイリスト解除で KV から消えた人をローカルが復活させない）。
 * POST 直後のみ、自分の楽観行をサーバーにまだ無いときだけ足す。
 */
function mergeParticipantMapsPreferServer(
  local: Record<string, ParticipantRow>,
  server: Record<string, ParticipantRow>,
  currentUserId: string,
  mode: HydrateCollectionScopedMode
): Record<string, ParticipantRow> {
  const out: Record<string, ParticipantRow> = { ...server };
  if (mode !== "fromPost") return out;
  for (const [uid, row] of Object.entries(local)) {
    if (server[uid]) continue;
    if (uid === currentUserId) out[uid] = row;
  }
  return out;
}

function mergeJoinProfileMapsPreferServer(
  local: Record<string, MemberCollectionJoinProfile>,
  server: Record<string, MemberCollectionJoinProfile>,
  currentUserId: string,
  mode: HydrateCollectionScopedMode
): Record<string, MemberCollectionJoinProfile> {
  const out: Record<string, MemberCollectionJoinProfile> = { ...server };
  if (mode !== "fromPost") return out;
  for (const [uid, row] of Object.entries(local)) {
    if (server[uid]) continue;
    if (uid === currentUserId) out[uid] = row;
  }
  return out;
}

/** GET が POST より先に返ると投票直後のローカルが消えるため、票数は max、選択は votedAt が新しい方を採用 */
function mergeScopedGlobalMaps(
  local: Record<string, GlobalRow>,
  server: Record<string, GlobalRow>
): Record<string, GlobalRow> {
  const ids = new Set([...Object.keys(local), ...Object.keys(server)]);
  const out: Record<string, GlobalRow> = {};
  for (const id of ids) {
    const L = local[id];
    const S = server[id];
    if (L && S) {
      out[id] = {
        countA: Math.max(L.countA, S.countA),
        countB: Math.max(L.countB, S.countB),
      };
    } else if (S) out[id] = S;
    else if (L) out[id] = L;
  }
  return out;
}

function mergeUserSelectionRow(
  local: UserSelectionRow | undefined,
  server: UserSelectionRow | undefined
): UserSelectionRow | undefined {
  const lHas = Boolean(local?.userSelectedOption || local?.votedAt);
  const sHas = Boolean(server?.userSelectedOption || server?.votedAt);
  if (!lHas && !sHas) return undefined;
  if (!lHas) return server;
  if (!sHas) return local;
  if (local === undefined || server === undefined) {
    return local ?? server;
  }
  const L = local;
  const S = server;
  const lt = L.votedAt ?? "";
  const st = S.votedAt ?? "";
  if (st > lt) return { ...S };
  if (lt > st) return { ...L };
  return {
    userSelectedOption: S.userSelectedOption ?? L.userSelectedOption,
    votedAt: st || lt,
  };
}

function mergeScopedUserSelectionsMaps(
  local: Record<string, UserSelectionRow>,
  server: Record<string, UserSelectionRow>
): Record<string, UserSelectionRow> {
  const ids = new Set([...Object.keys(local), ...Object.keys(server)]);
  const out: Record<string, UserSelectionRow> = {};
  for (const id of ids) {
    const row = mergeUserSelectionRow(local[id], server[id]);
    if (row && (row.userSelectedOption || row.votedAt)) out[id] = row;
  }
  return out;
}

export type HydrateCollectionScopedMode = "fromFetch" | "fromPost";

/** KV から取得した内容で localStorage を上書き（他ユーザー分の集計を反映） */
export function hydrateCollectionScopedFromSnapshot(
  collectionId: string,
  snap: MemberCollectionVotesSnapshot,
  opts?: { mode?: HydrateCollectionScopedMode }
): void {
  const mode: HydrateCollectionScopedMode = opts?.mode ?? "fromFetch";
  const normalized = normalizeSnapshotKeys(snap);
  const localG = loadScopedGlobal(collectionId);
  /** POST 直後は楽観表示と競合し得るため max マージ。GET/ポーリングはサーバー集計を正とする（メンバー離脱で票数が減る） */
  const mergedGlobal =
    mode === "fromPost"
      ? mergeScopedGlobalMaps(localG, normalized.global)
      : { ...normalized.global };
  saveScopedGlobal(collectionId, mergedGlobal);
  const mergedUser = mergeScopedUserSelectionsMaps(loadScopedUserSelections(collectionId), normalized.userSelections);
  saveScopedUserSelections(collectionId, mergedUser);
  const uid = getCurrentActivityUserId();
  const mergedJoin = mergeJoinProfileMapsPreferServer(
    loadJoinProfilesMap(collectionId),
    normalized.joinProfiles ?? {},
    uid,
    mode
  );
  saveJoinProfilesMap(collectionId, mergedJoin);
  const mergedParticipants = mergeParticipantMapsPreferServer(
    loadParticipantsMap(collectionId),
    normalized.participants,
    uid,
    mode
  );
  saveParticipantsMap(collectionId, mergedParticipants);
  saveMemberUserIds(
    collectionId,
    Array.isArray(normalized.memberUserIds) ? normalized.memberUserIds : []
  );
  notifyCollectionScopedUpdated(collectionId);
}

/** マイリスト解除後など、他タブのコレ画面が即時 GET できるよう通知 */
export const MEMBER_COLLECTION_LEFT_EVENT = "vote_member_collection_left";

export function notifyMemberCollectionLeft(collectionId: string, userId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MEMBER_COLLECTION_LEFT_EVENT, { detail: { collectionId, userId } })
  );
}

/** 他タブのコレ画面用：指定ユーザーをローカル参加者から即除去（GET 前の表示更新） */
export function pruneLocalParticipant(collectionId: string, userId: string): void {
  if (!userId) return;
  const map = loadParticipantsMap(collectionId);
  if (!map[userId]) return;
  const next = { ...map };
  delete next[userId];
  saveParticipantsMap(collectionId, next);
  const joinMap = loadJoinProfilesMap(collectionId);
  if (joinMap[userId]) {
    const nextJoin = { ...joinMap };
    delete nextJoin[userId];
    saveJoinProfilesMap(collectionId, nextJoin);
  }
  const memberIds = loadMemberUserIds(collectionId).filter((id) => id !== userId);
  saveMemberUserIds(collectionId, memberIds);
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
    const res = await fetch(
      `${COLLECTION_READ_API(collectionId)}?userId=${encodeURIComponent(userId)}`,
      { cache: "no-store" }
    );
    if (res.status === 503) return { ok: false, reason: "no_kv" };
    if (res.status === 404) return { ok: false, reason: "not_found" };
    if (!res.ok) return { ok: false, reason: "error" };
    const data = (await res.json()) as Record<string, unknown>;
    if (typeof data.error === "string") return { ok: false, reason: "error" };

    const memberVotes = data.memberVotes;
    if (data.visibility === "member" && memberVotes != null) {
      const snap = parseMemberCollectionVotesPayload(memberVotes);
      if (snap) return { ok: true, snapshot: snap };
    }

    const resVotes = await fetch(`${VOTES_API(collectionId)}?userId=${encodeURIComponent(userId)}`, {
      cache: "no-store",
    });
    if (resVotes.status === 503) return { ok: false, reason: "no_kv" };
    if (resVotes.status === 404) return { ok: false, reason: "not_found" };
    if (!resVotes.ok) return { ok: false, reason: "error" };
    const snapLegacy = normalizeSnapshot(await resVotes.json());
    if (!snapLegacy) return { ok: false, reason: "error" };
    return { ok: true, snapshot: snapLegacy };
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
  const normalizedCardId = normalizeCardIdKey(cardId);
  const globalMap = loadScopedGlobal(collectionId);
  const current = globalMap[normalizedCardId] ?? globalMap[cardId] ?? { countA: 0, countB: 0 };
  const nextRow: GlobalRow = {
    countA: current.countA + (option === "A" ? 1 : 0),
    countB: current.countB + (option === "B" ? 1 : 0),
  };
  saveScopedGlobal(collectionId, { ...globalMap, [normalizedCardId]: nextRow });

  const user = loadScopedUserSelections(collectionId);
  const votedAt = new Date().toISOString();
  saveScopedUserSelections(collectionId, { ...user, [normalizedCardId]: { userSelectedOption: option, votedAt } });
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

/**
 * 投票者マップと参加プロフィール（投票前の参加登録）を合成して一覧化する。
 * API の joinProfiles は hydrate でローカルに保存されるが、表示はここで participants と合わせる。
 */
function mergeParticipantsWithJoinProfiles(
  voters: Record<string, Omit<CollectionScopedParticipant, "userId">>,
  joinProfiles: Record<string, MemberCollectionJoinProfile>
): Record<string, Omit<CollectionScopedParticipant, "userId">> {
  const merged: Record<string, Omit<CollectionScopedParticipant, "userId">> = { ...voters };
  for (const [userId, jp] of Object.entries(joinProfiles)) {
    if (merged[userId]) continue;
    merged[userId] = {
      name: jp.name,
      iconUrl: jp.iconUrl,
      lastVotedAt: jp.joinedAt,
    };
  }
  return merged;
}

/** 参加API用：投票前でも自分をローカル一覧に載せる（KV 反映待ちの間） */
export function upsertLocalJoinProfileFromAuth(collectionId: string): void {
  const auth = getAuth();
  if (!auth.isLoggedIn) return;
  const userId = getCurrentActivityUserId();
  const name =
    typeof auth.user?.name === "string" && auth.user.name.trim() ? auth.user.name.trim() : "ゲスト";
  const iconUrl =
    typeof auth.user?.iconUrl === "string" && auth.user.iconUrl.length > 0 ? auth.user.iconUrl : undefined;
  const joinedAt = new Date().toISOString();
  const map = loadJoinProfilesMap(collectionId);
  const prev = map[userId];
  const row: MemberCollectionJoinProfile = {
    name,
    ...(iconUrl ? { iconUrl } : {}),
    joinedAt:
      prev?.joinedAt && prev.joinedAt > "1970-01-02T00:00:00.000Z" ? prev.joinedAt : joinedAt,
  };
  saveJoinProfilesMap(collectionId, { ...map, [userId]: row });
  notifyCollectionScopedUpdated(collectionId);
}

/** メンバー限定コレクションの参加者一覧（コレ内で1票以上入れたユーザー・新しい活動順） */
export function getCollectionScopedParticipants(collectionId: string): CollectionScopedParticipant[] {
  const voters = loadParticipantsMap(collectionId);
  const epoch = new Date(0).toISOString();
  const list: CollectionScopedParticipant[] = Object.entries(voters)
    .filter(([, row]) => Boolean(row.lastVotedAt && row.lastVotedAt > epoch))
    .map(([userId, row]) => ({
      userId,
      name: resolveMemberDisplayName(userId, row.name),
      iconUrl: row.iconUrl ?? resolveMemberIconUrl(userId, row.iconUrl),
      lastVotedAt: row.lastVotedAt,
    }));
  list.sort((a, b) => (b.lastVotedAt || "").localeCompare(a.lastVotedAt || ""));
  return list;
}

/** メンバー限定の「参加した人」の表示用プロフィール（KV 同期済みのローカルコピー） */
export function getMemberJoinProfiles(collectionId: string): Record<string, MemberCollectionJoinProfile> {
  return loadJoinProfilesMap(collectionId);
}

/** コレクション内スコープの集計に、どれか1カードでも票があれば true */
export function collectionMemberScopedHasAnyVote(collectionId: string): boolean {
  const g = loadScopedGlobal(collectionId);
  for (const row of Object.values(g)) {
    if ((row.countA ?? 0) + (row.countB ?? 0) > 0) return true;
  }
  return false;
}

/** コレクション内の票数＋現在ユーザーの選択（コメントは含めない。親でグローバルと合成する） */
export function getCollectionScopedActivity(collectionId: string, cardId: string): CardActivity {
  const nid = normalizeCardIdKey(cardId);
  const globalMap = loadScopedGlobal(collectionId);
  const userMap = loadScopedUserSelections(collectionId);
  const g = globalMap[nid] ?? globalMap[cardId];
  const u = userMap[nid] ?? userMap[cardId];
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
    const nid = normalizeCardIdKey(id);
    result[nid] = getCollectionScopedActivity(collectionId, nid);
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
        cache: "no-store",
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
      if (snap) hydrateCollectionScopedFromSnapshot(collectionId, snap, { mode: "fromPost" });
    } catch {
      // ローカルは既に apply済み。API 失敗時はこの端末のみの集計のまま。
    }
  })();
}
