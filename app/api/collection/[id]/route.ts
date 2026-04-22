import { NextResponse } from "next/server";
import { getKV } from "../../../lib/kv";
import {
  memberGlobalKey,
  memberJoinProfileKey,
  memberPartsHashKey,
  memberPartsKey,
  memberUserKey,
  readMemberVotesMaps,
} from "../../../lib/memberCollectionVotesKv";

const KV_PREFIX = "vote_collection:";
const INDEX_KEY = "vote_collections_index";
const MEMBER_COLLECTIONS_PREFIX = "vote_member_collections:";
const MEMBER_COLLECTION_MEMBERS_PREFIX = "vote_member_collection_members:";

/** 公開・メンバー限定コレクションのみKVに保存。GETでリンクを知っている人（未ログイン含む）が閲覧可能 */
export type CollectionPayload = {
  id: string;
  name: string;
  color: string;
  gradient?: string;
  visibility: "public" | "private" | "member";
  cardIds: string[];
  createdByUserId?: string;
  createdByDisplayName?: string;
  createdByIconUrl?: string;
};

/** メンバー限定時のみ GET /api/collection/[id]?userId= に同梱（往復1回で画面を出す） */
export type MemberVotesBundle = {
  global: Record<string, { countA: number; countB: number }>;
  userSelections: Record<string, { userSelectedOption?: "A" | "B"; votedAt?: string }>;
  participants: Record<string, { name: string; iconUrl?: string; lastVotedAt: string }>;
  /** 参加APIで保存したプロフィール（コレ内に1票あるときだけUIで一覧に混ぜる） */
  joinProfiles: Record<string, { name: string; iconUrl?: string; joinedAt: string }>;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CollectionPayload | (CollectionPayload & { memberVotes: MemberVotesBundle }) | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  const id = (await params).id;
  if (!id) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  try {
    const raw = await kv.get<CollectionPayload>(KV_PREFIX + id);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (raw.visibility === "private") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (raw.visibility === "member") {
      const userId = new URL(request.url).searchParams.get("userId") ?? "";
      const memberVotes = await readMemberVotesMaps(kv, id, userId);
      return NextResponse.json({ ...raw, memberVotes });
    }
    return NextResponse.json(raw);
  } catch (e) {
    console.error("[api/collection] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

/** コレクション削除 or 非公開化時にKVから削除 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ ok: true });
  }
  const id = (await params).id;
  if (!id) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  try {
    const raw = await kv.get<CollectionPayload>(KV_PREFIX + id);
    await kv.del(KV_PREFIX + id);
    // 検索画面用の一覧からも削除（best-effort）
    try {
      const indexRaw = await kv.get<unknown>(INDEX_KEY);
      const list = Array.isArray(indexRaw) ? indexRaw : [];
      const next = list.filter((x) => !(x && typeof x === "object" && (x as { id?: unknown }).id === id));
      await kv.set(INDEX_KEY, next);
    } catch {
      // ignore
    }

    // メンバー限定: 参加者側の「参加中（bookmark）」も一括で削除
    if (raw && typeof raw === "object" && raw.visibility === "member") {
      const membersKey = MEMBER_COLLECTION_MEMBERS_PREFIX + id;
      const membersRaw = await kv.get<unknown>(membersKey);
      const memberUserIds = Array.isArray(membersRaw)
        ? membersRaw.filter((v): v is string => typeof v === "string" && v.length > 0)
        : [];

      for (const uid of memberUserIds) {
        const listKey = MEMBER_COLLECTIONS_PREFIX + uid;
        const listRaw = await kv.get<unknown>(listKey);
        const list = Array.isArray(listRaw) ? (listRaw as unknown[]) : [];
        const next = list.filter((x) => !(x && typeof x === "object" && (x as { id?: unknown }).id === id));
        await kv.set(listKey, next);

        // 可能なら個別ユーザー投票キーも掃除（best-effort）
        await kv.del(memberUserKey(id, uid));
      }

      // インデックスと集計も削除
      await Promise.all([
        kv.del(membersKey),
        kv.del(memberGlobalKey(id)),
        kv.del(memberPartsKey(id)),
        kv.del(memberPartsHashKey(id)),
        kv.del(memberJoinProfileKey(id)),
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/collection] DELETE error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
