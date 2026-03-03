/**
 * 「投票済みを表示」チェックボックスの状態を永続化。
 * ON = 投票済みも表示 / OFF = 未投票のみ / 初期 = ON
 */

const STORAGE_KEY = "vote_show_voted";

export function getShowVoted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "false") return false;
    if (raw === "true") return true;
  } catch {
    // ignore
  }
  return true;
}

export function setShowVoted(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}
