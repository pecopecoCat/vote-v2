import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";
import { httpResponseFromKvWriteError } from "../../lib/kvWriteErrors";
import { resolveStableVoteCardId, type VoteCardData } from "../../data/voteCards";

const KV_KEY = "vote_created_votes";

/** 保存形式: { userId: string, card: VoteCardData }[] */
export type CreatedVoteEntry = { userId: string; card: Record<string, unknown> };

function stableIdFromStoredCard(card: Record<string, unknown>): string {
  return resolveStableVoteCardId({
    patternType: "yellow-loops",
    question: typeof card.question === "string" ? card.question : "",
    optionA: typeof card.optionA === "string" ? card.optionA : "",
    optionB: typeof card.optionB === "string" ? card.optionB : "",
    countA: 0,
    countB: 0,
    commentCount: 0,
    id: typeof card.id === "string" ? card.id : undefined,
  } as VoteCardData);
}

export async function GET(): Promise<NextResponse<CreatedVoteEntry[] | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json(
      { error: "サーバー連携が利用できません。", code: "KV_NOT_CONFIGURED" },
      { status: 503 }
    );
  }
  try {
    const raw = await kv.get<CreatedVoteEntry[]>(KV_KEY);
    const list = Array.isArray(raw) ? raw : [];
    return NextResponse.json(list);
  } catch (e) {
    console.error("[api/created-votes] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json(
      { error: "サーバー連携が利用できません。", code: "KV_NOT_CONFIGURED" },
      { status: 503 }
    );
  }
  try {
    const body = (await request.json()) as {
      delete?: boolean;
      userId?: string;
      cardId?: string;
      card?: Record<string, unknown>;
    };

    if (body?.delete === true) {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const cardId = typeof body.cardId === "string" ? body.cardId : "";
      if (!userId || !cardId) {
        return NextResponse.json(
          { error: "リクエストが不正です。", code: "BAD_REQUEST" },
          { status: 400 }
        );
      }
      const list = (await kv.get<CreatedVoteEntry[]>(KV_KEY)) ?? [];
      const next = list.filter(
        (e) => !(e.userId === userId && stableIdFromStoredCard(e.card) === cardId)
      );
      await kv.set(KV_KEY, next);
      return NextResponse.json({ ok: true });
    }

    const userId = typeof body?.userId === "string" ? body.userId : "";
    const card = body?.card && typeof body.card === "object" ? body.card : null;
    if (!userId || !card) {
      return NextResponse.json(
        { error: "リクエストが不正です。", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }
    const list = (await kv.get<CreatedVoteEntry[]>(KV_KEY)) ?? [];
    const entry: CreatedVoteEntry = {
      userId,
      card: {
        ...card,
        id: (card.id as string) ?? `created-${Date.now()}`,
        createdAt: (card.createdAt as string) ?? new Date().toISOString(),
      },
    };
    const next = [entry, ...list];
    await kv.set(KV_KEY, next);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/created-votes] POST error:", e);
    if (e instanceof SyntaxError) {
      return NextResponse.json(
        { error: "リクエストの形式が不正です。", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }
    const r = httpResponseFromKvWriteError(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
