import { NextResponse } from "next/server";
import { getKV } from "../../../lib/kv";

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
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CollectionPayload | { error: string }>> {
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
