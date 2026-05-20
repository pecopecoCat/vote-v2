/**
 * Vercel KV (Upstash Redis) を利用する場合のみ有効。
 * KV_REST_API_URL / KV_REST_API_TOKEN を設定すると他ユーザーとデータ共有されます。
 *
 * development かつ上記未設定のときは、同一 dev サーバー内だけ有効なインメモリ KV を使う。
 * （`npm run dev` でメンバー限定コレの共有 URL を試すため。`next start` の本番モードでは無効・再起動で消える）
 */

let kvLoadPromise: Promise<KVClient | null> | null = null;
let devMemoryKvSingleton: KVClient | null = null;
let devMemoryKvWarned = false;

function jsonClone<T>(v: T): T {
  if (v === null || typeof v !== "object") return v;
  try {
    return JSON.parse(JSON.stringify(v)) as T;
  } catch {
    return v;
  }
}

function createDevMemoryKv(): KVClient {
  const strings = new Map<string, unknown>();
  const hashes = new Map<string, Record<string, string>>();
  const ttlTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const clearTtl = (key: string): void => {
    const prev = ttlTimers.get(key);
    if (prev) {
      clearTimeout(prev);
      ttlTimers.delete(key);
    }
  };

  const scheduleTtl = (key: string, ex?: number): void => {
    if (!ex || ex <= 0) return;
    clearTtl(key);
    ttlTimers.set(
      key,
      setTimeout(() => {
        strings.delete(key);
        ttlTimers.delete(key);
      }, ex * 1000)
    );
  };

  const memory = {
    async get<T>(key: string): Promise<T | null> {
      const v = strings.get(key);
      if (v === undefined) return null;
      return jsonClone(v) as T;
    },

    async del(key: string): Promise<number> {
      clearTtl(key);
      if (hashes.delete(key)) return 1;
      return strings.delete(key) ? 1 : 0;
    },

    async setnx(key: string, value: string): Promise<number> {
      if (strings.has(key)) return 0;
      clearTtl(key);
      strings.set(key, value);
      return 1;
    },

    async hgetall(key: string): Promise<Record<string, string> | null> {
      const h = hashes.get(key);
      if (!h) return null;
      return { ...h };
    },

    async hset(key: string, fields: Record<string, string>): Promise<number> {
      const cur = { ...(hashes.get(key) ?? {}) };
      Object.assign(cur, fields);
      hashes.set(key, cur);
      return 0;
    },

    async hdel(key: string, ...fields: string[]): Promise<number> {
      const h = hashes.get(key);
      if (!h) return 0;
      let removed = 0;
      for (const field of fields) {
        if (field in h) {
          delete h[field];
          removed++;
        }
      }
      if (Object.keys(h).length === 0) hashes.delete(key);
      return removed;
    },
  };

  /** 通常の `set(k,v)` と active-user の `set(k,v,{nx,ex})` の両対応（戻りは Upstash と揃える） */
  const setImpl = async (
    key: string,
    value: unknown,
    opts?: { nx?: boolean; ex?: number }
  ): Promise<unknown> => {
    if (opts?.nx && strings.has(key)) return null;
    clearTtl(key);
    strings.set(key, jsonClone(value));
    scheduleTtl(key, opts?.ex);
    return "OK";
  };

  return { ...memory, set: setImpl as KVClient["set"] } as KVClient;
}

export async function getKV(): Promise<KVClient | null> {
  const hasRemote =
    typeof process !== "undefined" &&
    Boolean(process.env?.KV_REST_API_URL && process.env?.KV_REST_API_TOKEN);

  if (hasRemote) {
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

  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    if (!devMemoryKvSingleton) {
      devMemoryKvSingleton = createDevMemoryKv();
      if (!devMemoryKvWarned && typeof console !== "undefined" && console.warn) {
        devMemoryKvWarned = true;
        console.warn(
          "[kv] KV_REST_API_URL / KV_REST_API_TOKEN が未設定のため、開発用インメモリ KV を使用しています（サーバー再起動でリセット）。本番では Vercel KV 等を設定してください。"
        );
      }
    }
    return devMemoryKvSingleton;
  }

  return null;
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
  hdel?: (key: string, ...fields: string[]) => Promise<number>;
};
