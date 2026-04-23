import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";
import { DEMO_USER_IDS, type DemoUserId } from "../../data/auth";

const KV_KEY_PREFIX = "vote_active_user:";
/** ログアウト取りこぼし対策：一定時間で自動解放（秒） */
const ACTIVE_USER_TTL_SEC = 60 * 60 * 12; // 12h

const VALID_IDS = new Set<string>(DEMO_USER_IDS);

function isValidUserId(v: unknown): v is DemoUserId {
  return typeof v === "string" && VALID_IDS.has(v);
}

function activeKey(userId: string): string {
  return KV_KEY_PREFIX + userId;
}

/** GET: 現在ログイン中のユーザーIDの一覧（最大10人） */
export async function GET(): Promise<NextResponse<{ userIds: string[] } | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ userIds: [] });
  }
  try {
    const userIds: string[] = [];
    for (const id of DEMO_USER_IDS) {
      const v = await kv.get<string>(activeKey(id));
      if (v != null) userIds.push(id);
    }
    return NextResponse.json({ userIds });
  } catch (e) {
    console.error("[api/active-user] GET error:", e);
    return NextResponse.json({ userIds: [] });
  }
}

/**
 * POST: ログイン時は { userId } で追加。setnx で原子的に判定し、同じ userId が既にいれば 409（二重ログイン禁止）。
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
      await kv.del(activeKey(logoutId));
      return NextResponse.json({ ok: true });
    }

    const userId = body.userId;
    if (userId === null || userId === undefined) {
      return NextResponse.json({ ok: true });
    }
    if (!isValidUserId(userId)) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    /**
     * 可能なら Redis の `SET key value NX EX <ttl>` を使って、
     * - 原子的に重複ログインを防ぎつつ
     * - ログアウト取りこぼし時も TTL で自然回復
     * を実現する。
     */
    const kvAny = kv as unknown as {
      set?: (key: string, value: string, opts?: { nx?: boolean; ex?: number }) => Promise<unknown>;
    };
    if (typeof kvAny.set === "function") {
      try {
        const r = await kvAny.set(activeKey(userId), "1", { nx: true, ex: ACTIVE_USER_TTL_SEC });
        // Upstash/Redis: 成功すると "OK"、既に存在すると null が返る
        if (r === null) {
          return NextResponse.json(
            { error: "このアカウントは別の端末でログイン中です。", code: "ALREADY_LOGGED_IN" },
            { status: 409 }
          );
        }
        return NextResponse.json({ ok: true });
      } catch {
        // fall through to legacy handling
      }
    }

    // 原子的に「いなければセット」。既に存在すれば 0 が返り二重ログインとみなす
    const setnx = kv.setnx;
    if (!setnx) {
      // setnx が無いクライアント用フォールバック（非推奨・競合あり）
      const v = await kv.get<string>(activeKey(userId));
      if (v != null) {
        return NextResponse.json(
          { error: "このアカウントは別の端末でログイン中です。", code: "ALREADY_LOGGED_IN" },
          { status: 409 }
        );
      }
      await kv.set(activeKey(userId), "1");
      return NextResponse.json({ ok: true });
    }
    const set = await setnx.call(kv, activeKey(userId), "1");
    if (set === 0) {
      return NextResponse.json(
        { error: "このアカウントは別の端末でログイン中です。", code: "ALREADY_LOGGED_IN" },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/active-user] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
