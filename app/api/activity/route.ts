import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";

const KV_GLOBAL = "vote_activity_global";
const KV_USER_PREFIX = "vote_activity_user_";

/** クライアントの voteCardActivity の GlobalCardData と同じ形 */
export type GlobalCardData = {
  countA: number;
  countB: number;
  comments: Array<{
    id: string;
    user: { name: string; iconUrl?: string };
    date: string;
    text: string;
    likeCount?: number;
  }>;
};

/** GET ?userId= → { global, userSelections } */
export async function GET(request: Request): Promise<NextResponse<Record<string, unknown> | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  try {
    const [global, userRaw] = await Promise.all([
      kv.get<Record<string, GlobalCardData>>(KV_GLOBAL),
      userId ? kv.get<Record<string, { userSelectedOption?: "A" | "B" }>>(KV_USER_PREFIX + userId) : null,
    ]);
    const globalData = global && typeof global === "object" ? global : {};
    const userSelections: Record<string, "A" | "B"> = {};
    if (userRaw && typeof userRaw === "object") {
      for (const [cardId, v] of Object.entries(userRaw)) {
        if (v?.userSelectedOption === "A" || v?.userSelectedOption === "B") {
          userSelections[cardId] = v.userSelectedOption;
        }
      }
    }
    return NextResponse.json({ global: globalData, userSelections });
  } catch (e) {
    console.error("[api/activity] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

/** POST body: { type: "vote", userId, cardId, option } | { type: "comment", cardId, comment } */
export async function POST(request: Request): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const type = body?.type as string;

    if (type === "vote") {
      const userId = body.userId as string;
      const cardId = body.cardId as string;
      const option = body.option as "A" | "B";
      if (!userId || !cardId || (option !== "A" && option !== "B")) {
        return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
      }
      const global = (await kv.get<Record<string, GlobalCardData>>(KV_GLOBAL)) ?? {};
      const current = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
      const nextGlobal = {
        ...global,
        [cardId]: {
          countA: current.countA + (option === "A" ? 1 : 0),
          countB: current.countB + (option === "B" ? 1 : 0),
          comments: current.comments ?? [],
        },
      };
      await kv.set(KV_GLOBAL, nextGlobal);
      const userKey = KV_USER_PREFIX + userId;
      const userData = (await kv.get<Record<string, { userSelectedOption?: "A" | "B" }>>(userKey)) ?? {};
      await kv.set(userKey, { ...userData, [cardId]: { userSelectedOption: option } });
      return NextResponse.json({ ok: true });
    }

    if (type === "comment") {
      const cardId = body.cardId as string;
      const comment = body.comment as { user?: { name: string; iconUrl?: string }; text?: string };
      if (!cardId || !comment?.user?.name || typeof comment.text !== "string") {
        return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
      }
      const global = (await kv.get<Record<string, GlobalCardData>>(KV_GLOBAL)) ?? {};
      const current = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
      const comments = Array.isArray(current.comments) ? current.comments : [];
      const newComment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        user: comment.user,
        date: new Date().toISOString(),
        text: comment.text,
        likeCount: 0,
      };
      await kv.set(KV_GLOBAL, {
        ...global,
        [cardId]: {
          countA: current.countA,
          countB: current.countB,
          comments: [...comments, newComment],
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  } catch (e) {
    console.error("[api/activity] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
