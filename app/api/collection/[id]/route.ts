import { NextResponse } from "next/server";
import { getKV } from "../../../lib/kv";
import { readMemberVotesMaps } from "../../../lib/memberCollectionVotesKv";

const KV_PREFIX = "vote_collection:";

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
    await kv.del(KV_PREFIX + id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/collection] DELETE error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
