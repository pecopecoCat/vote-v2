/**
 * ユーザーお気に入りタグ（mypage・検索画面で共通。ハートで追加・削除）
 * 初回は 0 件のまま。
 */

const STORAGE_KEY = "vote_favorite_tags";
const EVENT_NAME = "vote_favorite_tags_updated";

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && t.length > 0);
  } catch {
    return [];
  }
}

function save(tags: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

/** お気に入りタグ一覧を取得（初回・未登録時は 0 件） */
export function getFavoriteTags(): string[] {
  return load();
}

/** お気に入りタグ更新時に発火するイベント名（mypage などで購読して UI を更新する用） */
export function getFavoriteTagsUpdatedEventName(): string {
  return EVENT_NAME;
}

/** お気に入りに追加（重複は登録しない） */
export function addFavoriteTag(tag: string): void {
  const t = tag.trim();
  if (!t) return;
  const list = load();
  const lower = t.toLowerCase();
  if (list.some((x) => x.toLowerCase() === lower)) return;
  save([...list, t]);
}

/** お気に入りから削除 */
export function removeFavoriteTag(tag: string): void {
  const t = tag.trim();
  if (!t) return;
  const list = load();
  const lower = t.toLowerCase();
  save(list.filter((x) => x.toLowerCase() !== lower));
}

/** お気に入りかどうか */
export function isFavoriteTag(tag: string): boolean {
  const t = tag.trim();
  if (!t) return false;
  const list = load();
  const lower = t.toLowerCase();
  return list.some((x) => x.toLowerCase() === lower);
}

/** トグル（登録済みなら削除、未登録なら追加） */
export function toggleFavoriteTag(tag: string): boolean {
  const t = tag.trim();
  if (!t) return false;
  if (isFavoriteTag(t)) {
    removeFavoriteTag(t);
    return false;
  }
  addFavoriteTag(t);
  return true;
}
