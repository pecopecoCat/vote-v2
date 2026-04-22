/**
 * KV（Upstash 等）書き込み失敗を API レスポンスに変換する。
 * レコードサイズ超過・リクエスト過大はユーザー向けに区別する。
 */
export function httpResponseFromKvWriteError(e: unknown): {
  status: number;
  body: { error: string; code: string };
} {
  const raw =
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
      ? (e as { message: string }).message
      : String(e);
  const m = raw.toLowerCase();
  if (
    raw.includes("max single record") ||
    raw.includes("ERR max single record") ||
    m.includes("entity too large") ||
    raw.includes("413") ||
    m.includes("payload too large")
  ) {
    return {
      status: 507,
      body: {
        code: "STORAGE_LIMIT",
        error:
          "サーバー側の保存容量の上限に達したため、保存できませんでした。データ量を減らすか、時間をおいてから再度お試しください。",
      },
    };
  }
  return {
    status: 500,
    body: {
      code: "KV_WRITE_FAILED",
      error: "サーバーへの保存に失敗しました。しばらく時間をおいてから再度お試しください。",
    },
  };
}
