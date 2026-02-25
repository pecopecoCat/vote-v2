/**
 * 下書き（VOTE作成画面の一時保存）
 * localStorage で永続化。ゴミ箱で削除。
 */

const STORAGE_KEY = "vote_drafts";

export interface DraftItem {
  id: string;
  text: string;
  /** 保存日時（ISO）。一覧の並び用 */
  savedAt: string;
}

function load(): DraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DraftItem[]) : [];
  } catch {
    return [];
  }
}

function save(list: DraftItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/** 下書き一覧（保存日時降順） */
export function getDrafts(): DraftItem[] {
  const list = load();
  return [...list].sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
}

/** 下書きを1件追加 */
export function addDraft(text: string): void {
  const list = load();
  const item: DraftItem = {
    id: `draft-${Date.now()}`,
    text: text.trim(),
    savedAt: new Date().toISOString(),
  };
  if (!item.text) return;
  save([item, ...list]);
}

/** 下書きを1件削除（ゴミ箱タップ） */
export function deleteDraft(id: string): void {
  const list = load().filter((d) => d.id !== id);
  save(list);
}
