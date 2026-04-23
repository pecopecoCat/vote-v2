/**
 * 開発時のみの軽量パフォーマンス計測ユーティリティ。
 * localStorage に vote_perf="1" を入れたときだけ console.debug を出す。
 */

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "production") return false;
  try {
    return window.localStorage.getItem("vote_perf") === "1";
  } catch {
    return false;
  }
}

export function perfMeasure<T>(label: string, fn: () => T): T {
  if (!isEnabled() || typeof performance === "undefined") return fn();
  const t0 = performance.now();
  const result = fn();
  const dt = performance.now() - t0;
  // eslint-disable-next-line no-console
  console.debug(`[perf] ${label}: ${dt.toFixed(1)}ms`);
  return result;
}

