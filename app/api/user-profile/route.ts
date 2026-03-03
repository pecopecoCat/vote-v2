import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";

const KV_KEY_PREFIX = "vote_user_profile_";

/** GET ?userId=xxx → { name?, iconUrl? } */
export async function GET(request: Request): Promise<NextResponse<Record<string, unknown> | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  if (!userId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  try {
    const raw = await kv.get<{ name?: string; iconUrl?: string }>(KV_KEY_PREFIX + userId);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({});
    }
    const name = typeof raw.name === "string" ? raw.name : undefined;
    const iconUrl = typeof raw.iconUrl === "string" ? raw.iconUrl : undefined;
    return NextResponse.json({ name: name ?? undefined, iconUrl: iconUrl ?? undefined });
  } catch (e) {
    console.error("[api/user-profile] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

/** POST { userId, name?, iconUrl? } → { ok: boolean } */
export async function POST(request: Request): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const body = (await request.json()) as { userId?: string; name?: string; iconUrl?: string };
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }
    const raw = await kv.get<{ name?: string; iconUrl?: string }>(KV_KEY_PREFIX + userId);
    const current = raw && typeof raw === "object" ? raw : {};
    const next = {
      name: typeof body.name === "string" ? body.name : current.name,
      iconUrl: typeof body.iconUrl === "string" ? body.iconUrl : current.iconUrl,
    };
    await kv.set(KV_KEY_PREFIX + userId, next);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/user-profile] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
