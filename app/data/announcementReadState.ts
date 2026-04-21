import type { AnnouncementItem } from "./notifications";

const STORAGE_KEY = "vote_read_announcement_keys";

/** BottomNav 等が同タブで購読する更新通知（localStorage の storage は別タブのみ発火） */
export const ANNOUNCEMENTS_READ_STATE_EVENT = "vote-announcements-read-state";

export function getAnnouncementItemKey(item: AnnouncementItem): string {
  if (item.id) return item.id;
  return `${item.title}\n${item.date}`;
}

function parseReadKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persistReadKeys(keys: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
    window.dispatchEvent(new Event(ANNOUNCEMENTS_READ_STATE_EVENT));
  } catch {
    /* quota / private mode */
  }
}

export function hasUnreadAnnouncements(items: AnnouncementItem[]): boolean {
  if (typeof window === "undefined" || items.length === 0) return false;
  const read = parseReadKeys();
  return items.some((item) => !read.has(getAnnouncementItemKey(item)));
}

/** 表示中のお知らせ一覧をすべて既読にする（お知らせ画面で運営タブを表示したとき） */
export function markAnnouncementsAsRead(items: AnnouncementItem[]): void {
  if (typeof window === "undefined" || items.length === 0) return;
  const read = parseReadKeys();
  let changed = false;
  for (const item of items) {
    const k = getAnnouncementItemKey(item);
    if (!read.has(k)) {
      read.add(k);
      changed = true;
    }
  }
  if (changed) persistReadKeys(read);
}
