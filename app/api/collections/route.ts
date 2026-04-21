import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";

const INDEX_KEY = "vote_collections_index";

type IndexRow = {
  id: string;
  name: string;
  color: string;
  gradient?: string;
  visibility: "public" | "private" | "member";
  cardIds: string[];
  createdByUserId?: string;
  createdByDisplayName?: string;
  createdByIconUrl?: string;
};

function normalizeRow(raw: unknown): IndexRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const visibility =
    o.visibility === "public" || o.visibility === "private" || o.visibility === "member" ? o.visibility : "public";
  const cardIds = Array.isArray(o.cardIds) ? o.cardIds.filter((v): v is string => typeof v === "string") : [];
  const row: IndexRow = {
    id,
    name: typeof o.name === "string" ? o.name : "",
    color: typeof o.color === "string" ? o.color : "#E5E7EB",
    gradient: typeof o.gradient === "string" ? o.gradient : undefined,
    visibility,
    cardIds,
  };
  if (typeof o.createdByUserId === "string") row.createdByUserId = o.createdByUserId;
  if (typeof o.createdByDisplayName === "string" && o.createdByDisplayName.trim()) {
    row.createdByDisplayName = o.createdByDisplayName.trim();
  }
  if (typeof o.createdByIconUrl === "string" && o.createdByIconUrl.length > 0) {
    row.createdByIconUrl = o.createdByIconUrl;
  }
  return row;
}

/** GET: 検索画面用の「人気コレクション」候補（KVに保存された public/member のコレ一覧） */
export async function GET(): Promise<NextResponse<Record<string, unknown> | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const raw = await kv.get<unknown>(INDEX_KEY);
    const list = Array.isArray(raw) ? raw : [];
    const collections = list.map(normalizeRow).filter((v): v is IndexRow => v != null);
    return NextResponse.json({ collections });
  } catch (e) {
    console.error("[api/collections] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

