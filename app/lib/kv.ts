/**
 * Vercel KV (Upstash Redis) を利用する場合のみ有効。
 * KV_REST_API_URL / KV_REST_API_TOKEN を設定すると他ユーザーとデータ共有されます。
 */
let kvLoadPromise: Promise<KVClient | null> | null = null;

export async function getKV(): Promise<KVClient | null> {
  if (
    typeof process === "undefined" ||
    !process.env?.KV_REST_API_URL ||
    !process.env?.KV_REST_API_TOKEN
  ) {
    return null;
  }
  if (!kvLoadPromise) {
    kvLoadPromise = import("@vercel/kv")
      .then(({ kv }) => kv as KVClient)
      .catch((e) => {
        console.error("[kv] Failed to load @vercel/kv:", e);
        kvLoadPromise = null;
        return null;
      });
  }
  return kvLoadPromise;
}

/** KV クライアントの型（@vercel/kv の型に依存しない。del は Redis 仕様で number を返す） */
export type KVClient = {
  get: <T = unknown>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<void>;
  del: (key: string) => Promise<number>;
  /** キーが存在しないときだけセット。1=セットした, 0=既に存在（重複） */
  setnx?: (key: string, value: string) => Promise<number>;
  /** Redis Hash（@vercel/kv / Upstash に存在）— 参加者 userId フィールドを原子的に更新するのに使用 */
  hgetall?: (key: string) => Promise<Record<string, string> | null>;
  hset?: (key: string, fields: Record<string, string>) => Promise<unknown>;
};
