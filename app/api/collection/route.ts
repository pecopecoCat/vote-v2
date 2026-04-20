import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";

const KV_PREFIX = "vote_collection:";

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
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/collection] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
