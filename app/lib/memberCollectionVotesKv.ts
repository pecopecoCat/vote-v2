import type { KVClient } from "./kv";

export const COLLECTION_KV_PREFIX = "vote_collection:";
export const MEMBER_GLOBAL_PREFIX = "vote_coll_member_global:";
export const MEMBER_USER_PREFIX = "vote_coll_member_user:";
/** 旧: 1キーに JSON オブジェクト全体（並行 POST で参加者が欠けることがある） */
export const MEMBER_PARTS_PREFIX = "vote_coll_member_parts:";
/** 新: Redis Hash。field = userId, value = JSON（HSET はフィールド単位で原子的） */
export const MEMBER_PARTS_HASH_PREFIX = "vote_coll_member_parts_h:";

export type MemberGlobalMap = Record<string, { countA: number; countB: number }>;
export type MemberUserRow = { userSelectedOption?: "A" | "B"; votedAt?: string };
export type MemberUserMap = Record<string, MemberUserRow>;
export type MemberPartRow = { name: string; iconUrl?: string; lastVotedAt: string };
export type MemberPartsMap = Record<string, MemberPartRow>;

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
    const iconUrl = typeof o.iconUrl === "string" && o.iconUrl.length > 0 ? o.iconUrl : undefined;
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
  if (bt >= at) return { name: b.name, iconUrl: b.iconUrl ?? a.iconUrl, lastVotedAt: b.lastVotedAt };
  return { name: a.name, iconUrl: a.iconUrl ?? b.iconUrl, lastVotedAt: a.lastVotedAt };
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
export async function upsertParticipantInKv(
  kv: KVClient,
  collectionId: string,
  userId: string,
  row: MemberPartRow
): Promise<void> {
  const legacyKey = memberPartsKey(collectionId);
  if (kv.hset) {
    const hashKey = memberPartsHashKey(collectionId);
    await kv.hset(hashKey, { [userId]: JSON.stringify(row) });
    return;
  }
  const parts = (await kv.get<MemberPartsMap>(legacyKey)) ?? {};
  await kv.set(legacyKey, { ...parts, [userId]: row });
}

/** メンバー限定の集計・ユーザー選択・参加者（コレKVの有効確認後に呼ぶ想定） */
export async function readMemberVotesMaps(
  kv: KVClient,
  collectionId: string,
  userId: string
): Promise<{ global: MemberGlobalMap; userSelections: MemberUserMap; participants: MemberPartsMap }> {
  const [gRaw, uRaw, participants] = await Promise.all([
    kv.get<MemberGlobalMap>(memberGlobalKey(collectionId)),
    userId ? kv.get<MemberUserMap>(memberUserKey(collectionId, userId)) : Promise.resolve(null),
    readParticipantsMerged(kv, collectionId),
  ]);
  const global = gRaw && typeof gRaw === "object" ? gRaw : {};
  const userSelections: MemberUserMap = uRaw && typeof uRaw === "object" ? uRaw : {};
  return { global, userSelections, participants };
}
