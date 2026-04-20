/**
 * Vercel KV (Upstash Redis) を利用する場合のみ有効。
 * KV_REST_API_URL / KV_REST_API_TOKEN を設定すると他ユーザーとデータ共有されます。
 */
export async function getKV(): Promise<KVClient | null> {
  if (
    typeof process === "undefined" ||
    !process.env?.KV_REST_API_URL ||
    !process.env?.KV_REST_API_TOKEN
  ) {
    return null;
  }
  const { kv } = await import("@vercel/kv");
  return kv as KVClient;
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
