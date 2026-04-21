import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";
import type { CollectionPayload } from "../collection/[id]/route";

const KV_KEY_PREFIX = "vote_member_collections:";
const KV_MEMBERS_INDEX_PREFIX = "vote_member_collection_members:";

type MemberCollectionEntry = Pick<
  CollectionPayload,
  "id" | "name" | "color" | "gradient" | "visibility" | "cardIds" | "createdByUserId" | "createdByDisplayName" | "createdByIconUrl"
>;

function key(userId: string): string {
  return KV_KEY_PREFIX + userId;
}

function membersKey(collectionId: string): string {
  return KV_MEMBERS_INDEX_PREFIX + collectionId;
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

    // 削除時に参加者側の「参加中」を一括削除できるよう、逆引きインデックスを維持する
    const membersRaw = await kv.get<unknown>(membersKey(entry.id));
    const members = Array.isArray(membersRaw) ? membersRaw.filter((v): v is string => typeof v === "string" && v.length > 0) : [];
    if (!members.includes(userId)) {
      await kv.set(membersKey(entry.id), [...members, userId]);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/member-collections] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

/** DELETE body: { userId, collectionId } → 参加中リストから外す（マイリストから削除） */
export async function DELETE(
  request: Request
): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const kv = await getKV();
  if (!kv) return NextResponse.json({ ok: true });
  try {
    const body = (await request.json()) as { userId?: string; collectionId?: string };
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const collectionId = typeof body?.collectionId === "string" ? body.collectionId : "";
    if (!userId || !collectionId) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const existing = await kv.get<unknown>(key(userId));
    const list = Array.isArray(existing) ? existing : [];
    const normalized = list.map(normalizeEntry).filter((v): v is MemberCollectionEntry => v != null);
    const next = normalized.filter((c) => c.id !== collectionId);
    await kv.set(key(userId), next);

    const membersRaw = await kv.get<unknown>(membersKey(collectionId));
    const members = Array.isArray(membersRaw)
      ? membersRaw.filter((v): v is string => typeof v === "string" && v.length > 0)
      : [];
    const nextMembers = members.filter((uid) => uid !== userId);
    await kv.set(membersKey(collectionId), nextMembers);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/member-collections] DELETE error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

