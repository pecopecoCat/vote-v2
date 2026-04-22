import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";
import { httpResponseFromKvWriteError } from "../../lib/kvWriteErrors";

const KV_PREFIX = "vote_collection:";
const INDEX_KEY = "vote_collections_index";

type IndexRow = {
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

async function removeIndexRow(kv: NonNullable<Awaited<ReturnType<typeof getKV>>>, id: string): Promise<void> {
  const raw = await kv.get<unknown>(INDEX_KEY);
  const list = Array.isArray(raw) ? raw : [];
  const next = list.filter((v) => !(v && typeof v === "object" && (v as { id?: unknown }).id === id));
  await kv.set(INDEX_KEY, next);
}

/** 公開・メンバー限定のコレクションをKVに保存（リンクで誰でも閲覧可能に） */
export async function POST(request: Request): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ ok: true });
  }
  try {
    const body = (await request.json()) as {
      userId?: string;
      collection?: {
        id?: string;
        name?: string;
        color?: string;
        gradient?: string;
        visibility?: string;
        cardIds?: string[];
        createdByDisplayName?: string;
        createdByIconUrl?: string;
      };
    };
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const col = body?.collection && typeof body.collection === "object" ? body.collection : null;
    if (!col?.id || typeof col.name !== "string") {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }
    const visibility = col.visibility === "private" || col.visibility === "member" || col.visibility === "public"
      ? col.visibility
      : "public";
    const cardIds = Array.isArray(col.cardIds) ? col.cardIds.filter((id): id is string => typeof id === "string") : [];

    if (visibility === "private") {
      await kv.del(KV_PREFIX + col.id);
      await removeIndexRow(kv, col.id);
      return NextResponse.json({ ok: true });
    }

    const createdByDisplayName =
      typeof col.createdByDisplayName === "string" && col.createdByDisplayName.trim()
        ? col.createdByDisplayName.trim()
        : undefined;
    const createdByIconUrl =
      typeof col.createdByIconUrl === "string" && col.createdByIconUrl.length > 0
        ? col.createdByIconUrl
        : undefined;
    const payload = {
      id: col.id,
      name: String(col.name ?? ""),
      color: String(col.color ?? "#E5E7EB"),
      gradient: typeof col.gradient === "string" ? col.gradient : undefined,
      visibility,
      cardIds,
      createdByUserId: userId || undefined,
      ...(createdByDisplayName ? { createdByDisplayName } : {}),
      ...(createdByIconUrl ? { createdByIconUrl } : {}),
    };
    await kv.set(KV_PREFIX + col.id, payload);
    await upsertIndexRow(kv, payload as IndexRow);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/collection] POST error:", e);
    const r = httpResponseFromKvWriteError(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
