import {
  pickStoredIconUrl,
  resolveParticipantIconUrl,
  stripIconForParticipantStorage,
  stripParticipantRowForStorage,
} from "../data/memberParticipantAvatar";
import type { KVClient } from "./kv";

const USER_PROFILE_KV_PREFIX = "vote_user_profile_";

export const COLLECTION_KV_PREFIX = "vote_collection:";
export const MEMBER_GLOBAL_PREFIX = "vote_coll_member_global:";
export const MEMBER_USER_PREFIX = "vote_coll_member_user:";
/** 旧: 1キーに JSON オブジェクト全体（並行 POST で参加者が欠けることがある） */
export const MEMBER_PARTS_PREFIX = "vote_coll_member_parts:";
/** 新: Redis Hash。field = userId, value = JSON（HSET はフィールド単位で原子的） */
export const MEMBER_PARTS_HASH_PREFIX = "vote_coll_member_parts_h:";
/** 参加時に保存する表示用プロフィール（投票前でも、コレ内に1票入ったら一覧に出す） */
export const MEMBER_JOIN_PROFILE_PREFIX = "vote_coll_member_join_prof:";
/** 作成者削除時に参加者のマイリストを掃除するための逆引きインデックス */
export const MEMBER_COLLECTION_MEMBERS_PREFIX = "vote_member_collection_members:";

export type MemberGlobalMap = Record<string, { countA: number; countB: number }>;
export type MemberUserRow = { userSelectedOption?: "A" | "B"; votedAt?: string };
export type MemberUserMap = Record<string, MemberUserRow>;
export type MemberPartRow = { name: string; iconUrl?: string; lastVotedAt: string };
export type MemberPartsMap = Record<string, MemberPartRow>;

export type MemberJoinProfileRow = { name: string; iconUrl?: string; joinedAt: string };

type CollectionPayloadLite = { id: string; visibility?: string };

export function memberGlobalKey(collectionId: string): string {
  return MEMBER_GLOBAL_PREFIX + collectionId;
}

export function memberUserKey(collectionId: string, userId: string): string {
  return MEMBER_USER_PREFIX + collectionId + ":" + userId;
}

export function memberPartsKey(collectionId: string): string {
  return MEMBER_PARTS_PREFIX + collectionId;
}

export function memberPartsHashKey(collectionId: string): string {
  return MEMBER_PARTS_HASH_PREFIX + collectionId;
}

export function memberJoinProfileKey(collectionId: string): string {
  return MEMBER_JOIN_PROFILE_PREFIX + collectionId;
}

export function memberCollectionMembersKey(collectionId: string): string {
  return MEMBER_COLLECTION_MEMBERS_PREFIX + collectionId;
}

/** 投票・参加登録時にメンバー逆引きへ追加（作成者削除・参加解除の掃除用） */
export async function ensureCollectionMemberInKvIndex(
  kv: KVClient,
  collectionId: string,
  userId: string
): Promise<void> {
  if (!userId) return;
  const mKey = memberCollectionMembersKey(collectionId);
  const membersRaw = await kv.get<unknown>(mKey);
  const members = Array.isArray(membersRaw)
    ? membersRaw.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
  if (members.includes(userId)) return;
  await kv.set(mKey, [...members, userId]);
}

/** 指定ユーザーの memberUserKey からコレクション全体の票数を再集計 */
export async function rebuildMemberCollectionGlobalFromUserVotes(
  kv: KVClient,
  collectionId: string,
  userIds: Iterable<string>
): Promise<MemberGlobalMap> {
  const global: MemberGlobalMap = {};
  for (const uid of userIds) {
    const uRaw = await kv.get<MemberUserMap>(memberUserKey(collectionId, uid));
    if (!uRaw || typeof uRaw !== "object" || Array.isArray(uRaw)) continue;
    for (const [cardId, row] of Object.entries(uRaw)) {
      const opt =
        row?.userSelectedOption === "A" || row?.userSelectedOption === "B" ? row.userSelectedOption : null;
      if (!opt) continue;
      const cur = global[cardId] ?? { countA: 0, countB: 0 };
      global[cardId] =
        opt === "A" ? { countA: cur.countA + 1, countB: cur.countB } : { countA: cur.countA, countB: cur.countB + 1 };
    }
  }
  return global;
}

export async function readJoinProfilesMap(
  kv: KVClient,
  collectionId: string
): Promise<Record<string, MemberJoinProfileRow>> {
  const raw = await kv.get<unknown>(memberJoinProfileKey(collectionId));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, MemberJoinProfileRow> = {};
  for (const [uid, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : "ゲスト";
    const iconUrl = typeof o.iconUrl === "string" && o.iconUrl.length > 0 ? o.iconUrl : undefined;
    const joinedAt =
      typeof o.joinedAt === "string" && o.joinedAt.length > 0 ? o.joinedAt : new Date(0).toISOString();
    out[uid] = iconUrl ? { name, iconUrl, joinedAt } : { name, joinedAt };
  }
  return out;
}

export async function upsertJoinProfileInKv(
  kv: KVClient,
  collectionId: string,
  userId: string,
  row: MemberJoinProfileRow
): Promise<void> {
  const key = memberJoinProfileKey(collectionId);
  const cur = (await kv.get<Record<string, MemberJoinProfileRow>>(key)) ?? {};
  const prev = cur[userId];
  const joinedAt =
    prev?.joinedAt &&
    typeof prev.joinedAt === "string" &&
    prev.joinedAt > "1970-01-02T00:00:00.000Z"
      ? prev.joinedAt
      : row.joinedAt;
  const merged: MemberJoinProfileRow = {
    name: row.name,
    iconUrl: row.iconUrl ?? prev?.iconUrl,
    joinedAt,
  };
  await kv.set(key, { ...cur, [userId]: merged });
}

export async function removeUserJoinProfile(kv: KVClient, collectionId: string, userId: string): Promise<void> {
  const key = memberJoinProfileKey(collectionId);
  const cur = await kv.get<Record<string, MemberJoinProfileRow>>(key);
  if (!cur || typeof cur !== "object") return;
  if (!(userId in cur)) return;
  const { [userId]: _removed, ...rest } = cur;
  if (Object.keys(rest).length === 0) {
    await kv.del(key);
    return;
  }
  await kv.set(key, rest);
}

export async function loadMemberCollectionOrNull(
  kv: KVClient,
  collectionId: string
): Promise<CollectionPayloadLite | null> {
  const raw = await kv.get<CollectionPayloadLite>(COLLECTION_KV_PREFIX + collectionId);
  if (!raw || typeof raw !== "object" || raw.visibility !== "member") return null;
  return raw;
}

function parsePartRowJson(json: string): MemberPartRow | null {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : "ゲスト";
    const iconUrl = stripIconForParticipantStorage(typeof o.iconUrl === "string" ? o.iconUrl : undefined);
    const lastVotedAt =
      typeof o.lastVotedAt === "string" && o.lastVotedAt.length > 0 ? o.lastVotedAt : new Date(0).toISOString();
    return { name, iconUrl, lastVotedAt };
  } catch {
    return null;
  }
}

/** Hash の field から参加者マップへ */
function participantsFromHgetall(raw: Record<string, string> | null): MemberPartsMap {
  const out: MemberPartsMap = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [uid, json] of Object.entries(raw)) {
    if (typeof json !== "string") continue;
    const row = parsePartRowJson(json);
    if (row) out[uid] = row;
  }
  return out;
}

function mergePartRowsPreferNewer(a: MemberPartRow, b: MemberPartRow): MemberPartRow {
  const at = a.lastVotedAt ?? "";
  const bt = b.lastVotedAt ?? "";
  const iconUrl = stripIconForParticipantStorage(b.iconUrl) ?? stripIconForParticipantStorage(a.iconUrl);
  if (bt >= at) return { name: b.name, iconUrl, lastVotedAt: b.lastVotedAt };
  return { name: a.name, iconUrl, lastVotedAt: a.lastVotedAt };
}

/** 参加者: Hash（新）と旧 JSON ストアをマージ（移行期・欠損防止） */
export async function readParticipantsMerged(kv: KVClient, collectionId: string): Promise<MemberPartsMap> {
  const hashKey = memberPartsHashKey(collectionId);
  const legacyKey = memberPartsKey(collectionId);

  let fromHash: MemberPartsMap = {};
  let legacy: MemberPartsMap = {};

  if (kv.hgetall) {
    const [raw, legacyRaw] = await Promise.all([
      kv.hgetall(hashKey),
      kv.get<MemberPartsMap>(legacyKey),
    ]);
    fromHash = participantsFromHgetall(raw);
    legacy =
      legacyRaw && typeof legacyRaw === "object" && !Array.isArray(legacyRaw) ? legacyRaw : {};
  } else {
    const legacyRaw = await kv.get<MemberPartsMap>(legacyKey);
    legacy =
      legacyRaw && typeof legacyRaw === "object" && !Array.isArray(legacyRaw) ? legacyRaw : {};
  }

  const ids = new Set([...Object.keys(legacy), ...Object.keys(fromHash)]);
  const out: MemberPartsMap = {};
  for (const uid of ids) {
    const L = legacy[uid];
    const H = fromHash[uid];
    if (L && H) out[uid] = mergePartRowsPreferNewer(L, H);
    else if (H) out[uid] = H;
    else if (L) out[uid] = L;
  }
  return out;
}

/**
 * 1ユーザーの参加者行を保存。hset が使えれば Hash のみ更新（並行投票でも他メンバーが消えない）。
 */
/** マイリスト解除時: Hash / 旧 JSON の両方から参加者行を削除 */
export async function removeParticipantFromKv(
  kv: KVClient,
  collectionId: string,
  userId: string
): Promise<void> {
  const hashKey = memberPartsHashKey(collectionId);
  const legacyKey = memberPartsKey(collectionId);

  if (kv.hdel) {
    await kv.hdel(hashKey, userId);
  } else if (kv.hgetall && kv.hset) {
    const raw = await kv.hgetall(hashKey);
    if (raw && userId in raw) {
      const next = { ...raw };
      delete next[userId];
      if (Object.keys(next).length === 0) await kv.del(hashKey);
      else await kv.hset(hashKey, next);
    }
  }

  const legacyRaw = await kv.get<MemberPartsMap>(legacyKey);
  if (legacyRaw && typeof legacyRaw === "object" && !Array.isArray(legacyRaw) && userId in legacyRaw) {
    const { [userId]: _removed, ...rest } = legacyRaw;
    if (Object.keys(rest).length === 0) await kv.del(legacyKey);
    else await kv.set(legacyKey, rest);
  }
}

async function readParticipantRowFromKv(
  kv: KVClient,
  collectionId: string,
  userId: string
): Promise<MemberPartRow | null> {
  const merged = await readParticipantsMerged(kv, collectionId);
  return merged[userId] ?? null;
}

/** 投票 POST 時に iconUrl が省略されても、既存のアイコンを消さない */
function mergeParticipantRowForUpsert(existing: MemberPartRow | null, incoming: MemberPartRow): MemberPartRow {
  return stripParticipantRowForStorage({
    name: incoming.name,
    lastVotedAt: incoming.lastVotedAt,
    iconUrl:
      stripIconForParticipantStorage(incoming.iconUrl) ??
      stripIconForParticipantStorage(existing?.iconUrl),
  });
}

/** 他端末表示用: デモ既定アイコン・ユーザープロフィール KV で iconUrl を補完 */
async function enrichParticipantIconsFromProfiles(
  kv: KVClient,
  participants: MemberPartsMap
): Promise<MemberPartsMap> {
  const out: MemberPartsMap = { ...participants };
  const needsProfile: string[] = [];
  for (const [uid, row] of Object.entries(out)) {
    if (stripIconForParticipantStorage(row.iconUrl)) continue;
    const demo = resolveParticipantIconUrl(uid);
    if (demo) {
      out[uid] = { ...row, iconUrl: demo };
      continue;
    }
    needsProfile.push(uid);
  }
  await Promise.all(
    needsProfile.map(async (uid) => {
      const row = out[uid];
      if (!row) return;
      try {
        const prof = await kv.get<{ iconUrl?: string }>(USER_PROFILE_KV_PREFIX + uid);
        const iconUrl = stripIconForParticipantStorage(prof?.iconUrl);
        if (iconUrl) out[uid] = { ...row, iconUrl };
      } catch {
        /* ignore */
      }
    })
  );
  return out;
}

export async function upsertParticipantInKv(
  kv: KVClient,
  collectionId: string,
  userId: string,
  row: MemberPartRow
): Promise<void> {
  const existing = await readParticipantRowFromKv(kv, collectionId, userId);
  const merged = mergeParticipantRowForUpsert(existing, row);
  const legacyKey = memberPartsKey(collectionId);
  if (kv.hset) {
    const hashKey = memberPartsHashKey(collectionId);
    await kv.hset(hashKey, { [userId]: JSON.stringify(merged) });
    return;
  }
  const parts = (await kv.get<MemberPartsMap>(legacyKey)) ?? {};
  await kv.set(legacyKey, { ...parts, [userId]: merged });
}

/** 参加登録 API で積まれる「このコレに参加した userId」一覧 */
export async function readMemberCollectionMemberIds(
  kv: KVClient,
  collectionId: string
): Promise<string[]> {
  const raw = await kv.get<unknown>(memberCollectionMembersKey(collectionId));
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
}

/** 投票者・参加プロフィール・参加インデックスを突き合わせ、一覧に漏れが出ないようにする */
function enrichMemberMapsFromIndex(
  participants: MemberPartsMap,
  joinProfiles: Record<string, MemberJoinProfileRow>,
  memberIds: string[]
): { participants: MemberPartsMap; joinProfiles: Record<string, MemberJoinProfileRow> } {
  const parts = { ...participants };
  const jp = { ...joinProfiles };
  const epoch = new Date(0).toISOString();
  for (const uid of memberIds) {
    if (parts[uid] && jp[uid]) continue;
    if (parts[uid] && !jp[uid]) {
      jp[uid] = {
        name: parts[uid].name,
        iconUrl: parts[uid].iconUrl,
        joinedAt: parts[uid].lastVotedAt,
      };
      continue;
    }
    // 参加登録のみ（未投票）は joinProfiles / memberUserIds に留め、参加者一覧には載せない
    if (jp[uid] && !parts[uid]) {
      continue;
    }
    if (!jp[uid] && !parts[uid]) {
      jp[uid] = { name: uid, joinedAt: epoch };
    }
  }
  return { participants: parts, joinProfiles: jp };
}

/** メンバー限定の集計・ユーザー選択・参加者（コレKVの有効確認後に呼ぶ想定） */
export async function readMemberVotesMaps(
  kv: KVClient,
  collectionId: string,
  userId: string
): Promise<{
  global: MemberGlobalMap;
  userSelections: MemberUserMap;
  participants: MemberPartsMap;
  joinProfiles: Record<string, MemberJoinProfileRow>;
  memberUserIds: string[];
}> {
  const [gRaw, uRaw, participants, joinProfiles, memberUserIds] = await Promise.all([
    kv.get<MemberGlobalMap>(memberGlobalKey(collectionId)),
    userId ? kv.get<MemberUserMap>(memberUserKey(collectionId, userId)) : Promise.resolve(null),
    readParticipantsMerged(kv, collectionId),
    readJoinProfilesMap(kv, collectionId),
    readMemberCollectionMemberIds(kv, collectionId),
  ]);
  const global = gRaw && typeof gRaw === "object" ? gRaw : {};
  const userSelections: MemberUserMap = uRaw && typeof uRaw === "object" ? uRaw : {};
  const enriched = enrichMemberMapsFromIndex(participants, joinProfiles, memberUserIds);
  const participantsWithIcons = await enrichParticipantIconsFromProfiles(kv, enriched.participants);
  return {
    global,
    userSelections,
    participants: participantsWithIcons,
    joinProfiles: enriched.joinProfiles,
    memberUserIds,
  };
}
