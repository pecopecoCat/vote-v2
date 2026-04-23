import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";
import { appendMemberJoinOwnerEvent } from "../../lib/memberJoinOwnerNotifications";
import {
  type MemberJoinProfileRow,
  memberGlobalKey,
  memberPartsHashKey,
  memberPartsKey,
  memberUserKey,
  removeUserJoinProfile,
  upsertJoinProfileInKv,
} from "../../lib/memberCollectionVotesKv";
import type { CollectionPayload } from "../collection/[id]/route";

const COLLECTION_KV_PREFIX = "vote_collection:";

const KV_KEY_PREFIX = "vote_member_collections:";
const KV_MEMBERS_INDEX_PREFIX = "vote_member_collection_members:";
const KV_ACTIVITY_GLOBAL = "vote_activity_global";

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
    const body = (await request.json()) as {
      userId?: string;
      collection?: unknown;
      memberProfile?: { name?: string; iconUrl?: string };
    };
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    const entry = normalizeEntry(body.collection);
    if (!entry) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const existing = await kv.get<unknown>(key(userId));
    const list = Array.isArray(existing) ? existing : [];
    const normalized = list.map(normalizeEntry).filter((v): v is MemberCollectionEntry => v != null);
    const alreadyInMyList = normalized.some((c) => c.id === entry.id);
    if (!alreadyInMyList) {
      await kv.set(key(userId), [...normalized, entry]);
    }

    // 削除時に参加者側の「参加中」を一括削除できるよう、逆引きインデックスを維持する
    const membersRaw = await kv.get<unknown>(membersKey(entry.id));
    const members = Array.isArray(membersRaw) ? membersRaw.filter((v): v is string => typeof v === "string" && v.length > 0) : [];
    const wasNewMember = !members.includes(userId);
    if (wasNewMember) {
      await kv.set(membersKey(entry.id), [...members, userId]);
    }

    const mp = body.memberProfile;
    const displayName = typeof mp?.name === "string" && mp.name.trim() ? mp.name.trim() : "";

    // 既に参加済みの再訪でもプロフィールを更新（参加アイコン表示用）
    if (displayName) {
      const joinedAt = new Date().toISOString();
      const iconUrl =
        typeof mp?.iconUrl === "string" && mp.iconUrl.length > 0 ? mp.iconUrl : undefined;
      const row: MemberJoinProfileRow = iconUrl
        ? { name: displayName, iconUrl, joinedAt }
        : { name: displayName, joinedAt };
      await upsertJoinProfileInKv(kv, entry.id, userId, row);
    }

    // 初参加のみ：コレ作成者にお知らせ（再訪の POST では送らない）
    if (wasNewMember) {
      try {
        const colRaw = await kv.get<Record<string, unknown>>(COLLECTION_KV_PREFIX + entry.id);
        const ownerId =
          colRaw && typeof colRaw.createdByUserId === "string" && colRaw.createdByUserId.length > 0
            ? colRaw.createdByUserId
            : undefined;
        const collectionName =
          colRaw && typeof colRaw.name === "string" && colRaw.name.trim()
            ? colRaw.name.trim()
            : entry.name.trim() || "コレクション";
        if (ownerId && ownerId !== userId) {
          const actorName = displayName || "ゲスト";
          const actorIconUrl =
            typeof mp?.iconUrl === "string" && mp.iconUrl.length > 0 ? mp.iconUrl : undefined;
          await appendMemberJoinOwnerEvent(kv, ownerId, {
            at: new Date().toISOString(),
            actorUserId: userId,
            actorName,
            ...(actorIconUrl ? { actorIconUrl } : {}),
            collectionId: entry.id,
            collectionName,
          });
        }
      } catch {
        // ignore
      }
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

    await removeUserJoinProfile(kv, collectionId, userId);

    // 参加中解除 = そのユーザーのコレ内投票・参加者行も掃除し、全体集計を再計算（best-effort）
    try {
      await kv.del(memberUserKey(collectionId, userId));

      // 参加者: 新 Hash があればそこから削除、無ければ旧 JSON マップから削除
      const kvAny = kv as unknown as { hdel?: (key: string, fields: string[]) => Promise<unknown> };
      if (typeof kvAny.hdel === "function") {
        await kvAny.hdel(memberPartsHashKey(collectionId), [userId]);
      } else {
        const legacyKey = memberPartsKey(collectionId);
        const legacyRaw = await kv.get<unknown>(legacyKey);
        if (legacyRaw && typeof legacyRaw === "object" && !Array.isArray(legacyRaw)) {
          const cur = legacyRaw as Record<string, unknown>;
          if (userId in cur) {
            const { [userId]: _removed, ...rest } = cur;
            if (Object.keys(rest).length === 0) await kv.del(legacyKey);
            else await kv.set(legacyKey, rest);
          }
        }
      }

      // 全体集計を、残っているメンバーの userSelections から再構築
      const global: Record<string, { countA: number; countB: number }> = {};
      for (const uid of nextMembers) {
        const uRaw = await kv.get<unknown>(memberUserKey(collectionId, uid));
        if (!uRaw || typeof uRaw !== "object" || Array.isArray(uRaw)) continue;
        for (const [cardId, rowRaw] of Object.entries(uRaw as Record<string, unknown>)) {
          if (!rowRaw || typeof rowRaw !== "object") continue;
          const r = rowRaw as Record<string, unknown>;
          const opt = r.userSelectedOption === "A" || r.userSelectedOption === "B" ? r.userSelectedOption : null;
          if (!opt) continue;
          const cur = global[cardId] ?? { countA: 0, countB: 0 };
          global[cardId] =
            opt === "A" ? { countA: cur.countA + 1, countB: cur.countB } : { countA: cur.countA, countB: cur.countB + 1 };
        }
      }
      if (Object.keys(global).length === 0) {
        await kv.del(memberGlobalKey(collectionId));
      } else {
        await kv.set(memberGlobalKey(collectionId), global);
      }
    } catch {
      // ignore
    }

    // 参加中解除 = そのユーザーのコレ内コメントも掃除（コメントに userId が保存されている分のみ）
    try {
      const colRaw = await kv.get<unknown>(COLLECTION_KV_PREFIX + collectionId);
      const cardIds =
        colRaw && typeof colRaw === "object" && Array.isArray((colRaw as { cardIds?: unknown }).cardIds)
          ? ((colRaw as { cardIds?: unknown }).cardIds as unknown[]).filter((v): v is string => typeof v === "string")
          : [];
      if (cardIds.length > 0) {
        const activity = (await kv.get<Record<string, { countA: number; countB: number; comments?: unknown }>>(KV_ACTIVITY_GLOBAL)) ?? {};
        let changed = false;
        const next = { ...activity };
        for (const cardId of cardIds) {
          const row = activity[cardId];
          const comments = Array.isArray(row?.comments) ? (row!.comments as unknown[]) : [];
          const filtered = comments.filter((c) => {
            if (!c || typeof c !== "object") return true;
            const o = c as Record<string, unknown>;
            if (o.collectionId !== collectionId) return true;
            return o.userId !== userId;
          });
          if (filtered.length !== comments.length) {
            changed = true;
            next[cardId] = { ...(row ?? { countA: 0, countB: 0, comments: [] }), comments: filtered as any };
          }
        }
        if (changed) await kv.set(KV_ACTIVITY_GLOBAL, next);
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/member-collections] DELETE error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

