/**
 * 非表示にしたユーザーID一覧（「そのユーザーに対して非表示」用）
 * localStorage で永続化。
 */

const STORAGE_KEY = "vote_hidden_user_ids";
const EVENT_NAME = "vote_hidden_users_updated";

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function save(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // ignore
  }
}

export function getHiddenUserIds(): string[] {
  return load();
}

export function addHiddenUser(userId: string): void {
  const ids = load();
  if (ids.includes(userId)) return;
  save([...ids, userId]);
}

export function removeHiddenUser(userId: string): void {
  save(load().filter((id) => id !== userId));
}

export function getHiddenUsersUpdatedEventName(): string {
  return EVENT_NAME;
}
