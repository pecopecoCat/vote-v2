import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";
import type { CollectionPayload } from "../collection/[id]/route";

const KV_KEY_PREFIX = "vote_member_collections:";

type MemberCollectionEntry = Pick<
  CollectionPayload,
  "id" | "name" | "color" | "gradient" | "visibility" | "cardIds" | "createdByUserId" | "createdByDisplayName" | "createdByIconUrl"
>;

function key(userId: string): string {
  return KV_KEY_PREFIX + userId;
}

function normalizeEntry(raw: unknown): MemberCollectionEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const visibility = o.visibility === "member" ? "member" : null;
  if (!visibility) return null;
  const cardIds = Array.isArray(o.cardIds) ? o.cardIds.filter((v): v is string => typeof v === "string") : [];
  const createdByUserId = typeof o.createdByUserId === "string" ? o.createdByUserId : undefined;
  const createdByDisplayName =
    typeof o.createdByDisplayName === "string" && o.createdByDisplayName.trim() ? o.createdByDisplayName.trim() : undefined;
  const createdByIconUrl = typeof o.createdByIconUrl === "string" && o.createdByIconUrl.length > 0 ? o.createdByIconUrl : undefined;
  return {
    id,
    name: typeof o.name === "string" ? o.name : "",
    color: typeof o.color === "string" ? o.color : "#E5E7EB",
    gradient: typeof o.gradient === "string" ? o.gradient : undefined,
    visibility,
    cardIds,
    createdByUserId,
    createdByDisplayName,
    createdByIconUrl,
  };
}

/** GET ?userId=xxx → { collections: MemberCollectionEntry[] } */
export async function GET(request: Request): Promise<NextResponse<Record<string, unknown> | { error: string }>> {
  const kv = await getKV();
  if (!kv) return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  if (!userId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  try {
    const raw = await kv.get<unknown>(key(userId));
    const list = Array.isArray(raw) ? raw : [];
    const collections = list.map(normalizeEntry).filter((v): v is MemberCollectionEntry => v != null);
    return NextResponse.json({ collections });
  } catch (e) {
    console.error("[api/member-collections] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

/** POST { userId, collection } → { ok } */
export async function POST(request: Request): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const kv = await getKV();
  if (!kv) return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  try {
    const body = (await request.json()) as { userId?: string; collection?: unknown };
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    const entry = normalizeEntry(body.collection);
    if (!entry) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const existing = await kv.get<unknown>(key(userId));
    const list = Array.isArray(existing) ? existing : [];
    const normalized = list.map(normalizeEntry).filter((v): v is MemberCollectionEntry => v != null);
    if (normalized.some((c) => c.id === entry.id)) {
      return NextResponse.json({ ok: true });
    }
    await kv.set(key(userId), [...normalized, entry]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/member-collections] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

