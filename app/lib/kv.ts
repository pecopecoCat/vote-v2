/**
 * Vercel KV (Upstash Redis) を利用する場合のみ有効。
 * KV_REST_API_URL / KV_REST_API_TOKEN を設定すると他ユーザーとデータ共有されます。
 */
export async function getKV(): Promise<import("@vercel/kv").kv | null> {
  if (
    typeof process === "undefined" ||
    !process.env?.KV_REST_API_URL ||
    !process.env?.KV_REST_API_TOKEN
  ) {
    return null;
  }
  const { kv } = await import("@vercel/kv");
  return kv;
}
