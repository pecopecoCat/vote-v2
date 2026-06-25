import { NextResponse } from "next/server";
import { getKV } from "../../../../lib/kv";
import { httpResponseFromKvWriteError } from "../../../../lib/kvWriteErrors";
import type { CollectionPayload } from "../route";

const KV_PREFIX = "vote_collection:";
const INDEX_KEY = "vote_collections_index";

type IndexRow = {
  id: string;
  name: string;
  color: string;
  gradient?: string;
  visibility: "public" | "private" | "member";
  cardIds: string[];
  category?: string;
  coverImageUrl?: string;
  createdByUserId?: string;
  createdByDisplayName?: string;
  createdByIconUrl?: string;
};

async function upsertIndexRow(
  kv: NonNullable<Awaited<ReturnType<typeof getKV>>>,
  row: IndexRow
): Promise<void> {
  const raw = await kv.get<unknown>(INDEX_KEY);
  const list = Array.isArray(raw) ? raw : [];
  const next: unknown[] = [];
  for (const v of list) {
    if (!v || typeof v !== "object") continue;
    const id = (v as { id?: unknown }).id;
    if (id === row.id) continue;
    next.push(v);
  }
  next.push(row);
  await kv.set(INDEX_KEY, next);
}

/** POST: 公開コレへ VOTE 追加（誰でも）／削除（作成者のみ）。メンバー限定は作成者のみ。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  const collectionId = (await params).id;
  if (!collectionId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  try {
    const body = (await request.json()) as {
      userId?: string;
      cardId?: string;
      action?: string;
    };
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
    const action = body.action === "remove" ? "remove" : "add";
    if (!userId || !cardId) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const raw = await kv.get<CollectionPayload>(KV_PREFIX + collectionId);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (raw.visibility === "private") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const ownerId = typeof raw.createdByUserId === "string" ? raw.createdByUserId : "";
    const isOwner = Boolean(ownerId && ownerId === userId);
    const cardIds = Array.isArray(raw.cardIds)
      ? raw.cardIds.filter((id): id is string => typeof id === "string")
      : [];

    if (raw.visibility === "member") {
      if (!isOwner) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    } else if (raw.visibility === "public") {
      if (action === "remove" && !isOwner) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    }

    let nextCardIds = cardIds;
    if (action === "add") {
      if (cardIds.includes(cardId)) {
        return NextResponse.json({ ok: true });
      }
      nextCardIds = [...cardIds, cardId];
    } else {
      if (!cardIds.includes(cardId)) {
        return NextResponse.json({ ok: true });
      }
      nextCardIds = cardIds.filter((id) => id !== cardId);
    }

    const payload: CollectionPayload = {
      ...raw,
      cardIds: nextCardIds,
    };
    await kv.set(KV_PREFIX + collectionId, payload);
    await upsertIndexRow(kv, payload as IndexRow);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/collection/cards] POST error:", e);
    const r = httpResponseFromKvWriteError(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
