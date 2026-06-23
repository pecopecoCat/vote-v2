import type { CollectionCategory } from "../data/collectionCategories";

/** 検索の人気コレ・参加コレ掃除で共有する /api/collections 結果キャッシュ */

export type CollectionsIndexRow = {
  id: string;
  name: string;
  color: string;
  gradient?: string;
  visibility: string;
  cardIds: string[];
  category?: CollectionCategory;
  createdByUserId?: string;
  createdByDisplayName?: string;
  createdByIconUrl?: string;
};

let cache: { at: number; rows: CollectionsIndexRow[] } | null = null;
const TTL_MS = 60_000;

function normalizeRow(raw: unknown): CollectionsIndexRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  return {
    id,
    name: typeof o.name === "string" ? o.name : "",
    color: typeof o.color === "string" ? o.color : "#E5E7EB",
    gradient: typeof o.gradient === "string" ? o.gradient : undefined,
    visibility: typeof o.visibility === "string" ? o.visibility : "public",
    cardIds: Array.isArray(o.cardIds) ? o.cardIds.filter((x): x is string => typeof x === "string") : [],
    category: typeof o.category === "string" ? (o.category as CollectionCategory) : undefined,
    createdByUserId: typeof o.createdByUserId === "string" ? o.createdByUserId : undefined,
    createdByDisplayName:
      typeof o.createdByDisplayName === "string" && o.createdByDisplayName.trim()
        ? o.createdByDisplayName.trim()
        : undefined,
    createdByIconUrl: typeof o.createdByIconUrl === "string" && o.createdByIconUrl.length > 0 ? o.createdByIconUrl : undefined,
  };
}

/** KV のコレクション一覧 index（短時間キャッシュで同一セッションの二重 GET を防ぐ） */
export async function fetchCollectionsIndex(force = false): Promise<CollectionsIndexRow[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) {
    return cache.rows;
  }
  try {
    const res = await fetch("/api/collections");
    if (!res.ok) return cache?.rows ?? [];
    const data = (await res.json()) as { collections?: unknown };
    const list = Array.isArray(data?.collections) ? data.collections : [];
    const rows = list.map(normalizeRow).filter((v): v is CollectionsIndexRow => v != null);
    cache = { at: Date.now(), rows };
    return rows;
  } catch {
    return cache?.rows ?? [];
  }
}
