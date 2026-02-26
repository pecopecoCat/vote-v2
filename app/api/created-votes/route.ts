import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";

const KV_KEY = "vote_created_votes";

/** 保存形式: { userId: string, card: VoteCardData }[] */
export type CreatedVoteEntry = { userId: string; card: Record<string, unknown> };

export async function GET(): Promise<NextResponse<CreatedVoteEntry[] | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
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
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const body = (await request.json()) as { userId?: string; card?: Record<string, unknown> };
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const card = body?.card && typeof body.card === "object" ? body.card : null;
    if (!userId || !card) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
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
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
