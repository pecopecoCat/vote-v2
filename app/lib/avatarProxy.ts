/**
 * 外部アバター URL をサーバー経由で配信するための同一オリジン URL を組み立てる。
 * Safari がサードパーティ画像 URL で失敗するケース（Referrer / ITP 等）の回避用。
 */

const MAX_QUERY_URL_LEN = 2048;

function isPrivateOrLoopbackIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  if ([a, b, c, d].some((n) => n > 255)) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/** サーバー側 fetch に渡してよい https のアバター URL か（簡易 SSRF 対策） */
export function isSafeAvatarFetchUrl(urlString: string): boolean {
  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (!host || host === "localhost") return false;
  if (host.endsWith(".local")) return false;
  if (isPrivateOrLoopbackIpv4(host)) return false;
  if (host.includes(":")) {
    const h = host.replace(/^\[|\]$/g, "").toLowerCase();
    if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return false;
  }
  return true;
}

/** 同一オリジン `/api/avatar` 経由の src。使えないときは null（呼び出し側は元 URL を使う） */
export function getAvatarProxySrc(resolvedHttpsUrl: string): string | null {
  if (!resolvedHttpsUrl.startsWith("https://")) return null;
  if (!isSafeAvatarFetchUrl(resolvedHttpsUrl)) return null;
  const q = `url=${encodeURIComponent(resolvedHttpsUrl)}`;
  if (q.length > MAX_QUERY_URL_LEN) return null;
  return `/api/avatar?${q}`;
}
