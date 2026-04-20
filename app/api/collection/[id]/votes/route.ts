import { NextResponse } from "next/server";
import { getKV } from "../../../../lib/kv";

const COLLECTION_KV_PREFIX = "vote_collection:";
const GLOBAL_PREFIX = "vote_coll_member_global:";
const USER_PREFIX = "vote_coll_member_user:";
const PARTS_PREFIX = "vote_coll_member_parts:";

type GlobalMap = Record<string, { countA: number; countB: number }>;
type UserRow = { userSelectedOption?: "A" | "B"; votedAt?: string };
type UserMap = Record<string, UserRow>;
type PartRow = { name: string; iconUrl?: string; lastVotedAt: string };
type PartsMap = Record<string, PartRow>;

type CollectionPayload = {
  id: string;
  visibility?: string;
};

function globalKey(collectionId: string): string {
  return GLOBAL_PREFIX + collectionId;
}

function userKey(collectionId: string, userId: string): string {
  return USER_PREFIX + collectionId + ":" + userId;
}

function partsKey(collectionId: string): string {
  return PARTS_PREFIX + collectionId;
}

async function loadMemberCollectionOrNull(
  kv: NonNullable<Awaited<ReturnType<typeof getKV>>>,
  collectionId: string
): Promise<CollectionPayload | null> {
  const raw = await kv.get<CollectionPayload>(COLLECTION_KV_PREFIX + collectionId);
  if (!raw || typeof raw !== "object" || raw.visibility !== "member") return null;
  return raw;
}

/** GET: KV にあるメンバー限定コレクションのスコープ投票を全員分の集計＋指定 userId の選択で返す */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<Record<string, unknown> | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  const collectionId = (await params).id;
  if (!collectionId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  try {
    const col = await loadMemberCollectionOrNull(kv, collectionId);
    if (!col) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const [gRaw, uRaw, pRaw] = await Promise.all([
      kv.get<GlobalMap>(globalKey(collectionId)),
      userId ? kv.get<UserMap>(userKey(collectionId, userId)) : Promise.resolve(null),
      kv.get<PartsMap>(partsKey(collectionId)),
    ]);
    const global = gRaw && typeof gRaw === "object" ? gRaw : {};
    const userSelections: UserMap = uRaw && typeof uRaw === "object" ? uRaw : {};
    const participants: PartsMap = pRaw && typeof pRaw === "object" ? pRaw : {};
    return NextResponse.json({ global, userSelections, participants });
  } catch (e) {
    console.error("[api/collection/votes] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

/** POST: メンバー限定コレクション内の1票（全体集計・ユーザー別・参加者） */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<Record<string, unknown> | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  const collectionId = (await params).id;
  if (!collectionId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  try {
    const col = await loadMemberCollectionOrNull(kv, collectionId);
    if (!col) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    const cardId = typeof body.cardId === "string" ? body.cardId : "";
    const option = body.option as "A" | "B";
    if (!userId || !cardId || (option !== "A" && option !== "B")) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const participant = body.participant as { name?: string; iconUrl?: string } | undefined;
    const name =
      typeof participant?.name === "string" && participant.name.trim() ? participant.name.trim() : "ゲスト";
    const iconUrl =
      typeof participant?.iconUrl === "string" && participant.iconUrl.length > 0 ? participant.iconUrl : undefined;
    const lastVotedAt = new Date().toISOString();

    const gKey = globalKey(collectionId);
    const global = (await kv.get<GlobalMap>(gKey)) ?? {};
    const cur = global[cardId] ?? { countA: 0, countB: 0 };
    const nextGlobal: GlobalMap = {
      ...global,
      [cardId]: {
        countA: cur.countA + (option === "A" ? 1 : 0),
        countB: cur.countB + (option === "B" ? 1 : 0),
      },
    };
    await kv.set(gKey, nextGlobal);

    const uK = userKey(collectionId, userId);
    const userData = (await kv.get<UserMap>(uK)) ?? {};
    await kv.set(uK, { ...userData, [cardId]: { userSelectedOption: option, votedAt: lastVotedAt } });

    const pK = partsKey(collectionId);
    const parts = (await kv.get<PartsMap>(pK)) ?? {};
    const nextParts: PartsMap = { ...parts, [userId]: { name, ...(iconUrl ? { iconUrl } : {}), lastVotedAt } };
    await kv.set(pK, nextParts);
    const participantsOut = (await kv.get<PartsMap>(pK)) ?? nextParts;

    const userSelections = (await kv.get<UserMap>(uK)) ?? {};

    return NextResponse.json({
      global: nextGlobal,
      userSelections,
      participants: participantsOut,
    });
  } catch (e) {
    console.error("[api/collection/votes] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
