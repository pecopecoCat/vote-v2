/** サーバー側 KV の稼働モード */
export type KvRuntimeMode = "remote" | "dev-memory" | "unconfigured";

export function hasKvEnvVars(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim()
  );
}

export function getKvRuntimeMode(): KvRuntimeMode {
  if (hasKvEnvVars()) return "remote";
  if (process.env.NODE_ENV === "development") return "dev-memory";
  return "unconfigured";
}

export function isServerStorageAvailable(): boolean {
  return getKvRuntimeMode() !== "unconfigured";
}
