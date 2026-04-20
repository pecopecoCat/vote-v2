import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";

const KV_KEY_PREFIX = "vote_bookmark_ids:";

function key(userId: string): string {
  return KV_KEY_PREFIX + userId;
}

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
}

/** GET ?userId=xxx → { ids: string[] } */
export async function GET(request: Request): Promise<NextResponse<Record<string, unknown> | { error: string }>> {
  const kv = await getKV();
  if (!kv) return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  if (!userId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  try {
    const raw = await kv.get<unknown>(key(userId));
    return NextResponse.json({ ids: normalizeIds(raw) });
  } catch (e) {
    console.error("[api/bookmarks] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

/** POST { userId, ids } → { ok } (全量置き換え) */
export async function POST(request: Request): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const kv = await getKV();
  if (!kv) return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  try {
    const body = (await request.json()) as { userId?: string; ids?: unknown };
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    const ids = normalizeIds(body.ids);
    await kv.set(key(userId), ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/bookmarks] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

