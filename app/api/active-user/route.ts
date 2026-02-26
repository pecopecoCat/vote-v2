import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";
import { DEMO_USER_IDS, type DemoUserId } from "../../data/auth";

const KV_KEY = "vote_active_user_ids";
const MAX_ACTIVE = 10;

const VALID_IDS = new Set<string>(DEMO_USER_IDS);

function isValidUserId(v: unknown): v is DemoUserId {
  return typeof v === "string" && VALID_IDS.has(v);
}

function getActiveList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && VALID_IDS.has(id));
}

/** GET: 現在ログイン中のユーザーIDの一覧（最大10人） */
export async function GET(): Promise<NextResponse<{ userIds: string[] } | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ userIds: [] });
  }
  try {
    const raw = await kv.get<unknown>(KV_KEY);
    const userIds = getActiveList(raw);
    return NextResponse.json({ userIds });
  } catch (e) {
    console.error("[api/active-user] GET error:", e);
    return NextResponse.json({ userIds: [] });
  }
}

/**
 * POST: ログイン時は { userId } で追加。同じ userId が既にいれば 409（二重ログイン禁止）。
 *       ログアウト時は { logoutUserId } でそのユーザーをリストから削除。
 */
export async function POST(
  request: Request
): Promise<NextResponse<{ ok: boolean } | { error: string; code?: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ ok: true });
  }
  try {
    const body = (await request.json()) as { userId?: string | null; logoutUserId?: string };

    if (typeof body.logoutUserId === "string") {
      const logoutId = body.logoutUserId;
      if (!isValidUserId(logoutId)) {
        return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
      }
      const raw = await kv.get<unknown>(KV_KEY);
      const list = getActiveList(raw).filter((id) => id !== logoutId);
      await kv.set(KV_KEY, list);
      return NextResponse.json({ ok: true });
    }

    const userId = body.userId;
    if (userId === null || userId === undefined) {
      return NextResponse.json({ ok: true });
    }
    if (!isValidUserId(userId)) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const raw = await kv.get<unknown>(KV_KEY);
    const list = getActiveList(raw);

    if (list.includes(userId)) {
      return NextResponse.json(
        { error: "このアカウントは別の端末でログイン中です。", code: "ALREADY_LOGGED_IN" },
        { status: 409 }
      );
    }
    if (list.length >= MAX_ACTIVE) {
      return NextResponse.json(
        { error: "ログイン可能な人数が上限です（10人）", code: "MAX_USERS" },
        { status: 409 }
      );
    }

    list.push(userId);
    await kv.set(KV_KEY, list);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/active-user] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
