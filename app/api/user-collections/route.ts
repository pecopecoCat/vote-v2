import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";

const KV_KEY_PREFIX = "vote_user_owned_collections:";

function key(userId: string): string {
  return KV_KEY_PREFIX + userId;
}

type StoredCollection = {
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

function normalizeOne(raw: unknown): StoredCollection | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const vis = o.visibility === "private" || o.visibility === "member" || o.visibility === "public" ? o.visibility : "public";
  const cardIds = Array.isArray(o.cardIds) ? o.cardIds.filter((v): v is string => typeof v === "string") : [];
  const name = typeof o.name === "string" ? o.name : "";
  const color = typeof o.color === "string" ? o.color : "#E5E7EB";
  const gradient = typeof o.gradient === "string" ? o.gradient : undefined;
  const createdByUserId = typeof o.createdByUserId === "string" ? o.createdByUserId : undefined;
  const createdByDisplayName =
    typeof o.createdByDisplayName === "string" && o.createdByDisplayName.trim()
      ? o.createdByDisplayName.trim()
      : undefined;
  const createdByIconUrl =
    typeof o.createdByIconUrl === "string" && o.createdByIconUrl.length > 0 ? o.createdByIconUrl : undefined;
  return {
    id,
    name,
    color,
    gradient,
    visibility: vis,
    cardIds,
    ...(createdByUserId ? { createdByUserId } : {}),
    ...(createdByDisplayName ? { createdByDisplayName } : {}),
    ...(createdByIconUrl ? { createdByIconUrl } : {}),
  };
}

/** GET ?userId= — ログインユーザーが作成したコレのみ（非公開含む）。参加中メンバー限定は含めない。 */
export async function GET(request: Request): Promise<NextResponse<Record<string, unknown> | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  if (!userId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  try {
    const raw = await kv.get<unknown>(key(userId));
    const list = Array.isArray(raw) ? raw : [];
    const collections = list.map(normalizeOne).filter((v): v is StoredCollection => v != null);
    return NextResponse.json({ collections });
  } catch (e) {
    console.error("[api/user-collections] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

/** PUT { userId, collections } — 作成コレ一覧を丸ごと置換（端末間同期用） */
export async function PUT(request: Request): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ ok: true });
  }
  try {
    const body = (await request.json()) as { userId?: string; collections?: unknown };
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }
    const arr = Array.isArray(body.collections) ? body.collections : [];
    const normalized = arr.map(normalizeOne).filter((v): v is StoredCollection => v != null);
    await kv.set(key(userId), normalized);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/user-collections] PUT error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
