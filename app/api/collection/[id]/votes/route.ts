import { NextResponse } from "next/server";
import { getKV } from "../../../../lib/kv";
import {
  loadMemberCollectionOrNull,
  memberGlobalKey,
  memberUserKey,
  readJoinProfilesMap,
  readMemberVotesMaps,
  readParticipantsMerged,
  upsertParticipantInKv,
  type MemberPartRow,
} from "../../../../lib/memberCollectionVotesKv";

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
    const body = await readMemberVotesMaps(kv, collectionId, userId);
    return NextResponse.json(body);
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

    const gKey = memberGlobalKey(collectionId);
    const global = (await kv.get<Record<string, { countA: number; countB: number }>>(gKey)) ?? {};
    const cur = global[cardId] ?? { countA: 0, countB: 0 };
    const nextGlobal: Record<string, { countA: number; countB: number }> = {
      ...global,
      [cardId]: {
        countA: cur.countA + (option === "A" ? 1 : 0),
        countB: cur.countB + (option === "B" ? 1 : 0),
      },
    };
    await kv.set(gKey, nextGlobal);

    const uK = memberUserKey(collectionId, userId);
    const userData = (await kv.get<Record<string, { userSelectedOption?: "A" | "B"; votedAt?: string }>>(uK)) ?? {};
    await kv.set(uK, { ...userData, [cardId]: { userSelectedOption: option, votedAt: lastVotedAt } });

    const partRow: MemberPartRow = { name, lastVotedAt, ...(iconUrl ? { iconUrl } : {}) };
    await upsertParticipantInKv(kv, collectionId, userId, partRow);
    const participantsOut = await readParticipantsMerged(kv, collectionId);
    const joinProfilesOut = await readJoinProfilesMap(kv, collectionId);

    const userSelections = (await kv.get<typeof userData>(uK)) ?? {};

    return NextResponse.json({
      global: nextGlobal,
      userSelections,
      participants: participantsOut,
      joinProfiles: joinProfilesOut,
    });
  } catch (e) {
    console.error("[api/collection/votes] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
