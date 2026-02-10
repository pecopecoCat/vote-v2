/**
 * 「興味がない」タグ（注目タグに表示しない＝VOTEに表示しない）
 */

const STORAGE_KEY = "vote_hidden_tags";

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
  } catch {
    // ignore
  }
}

export function getHiddenTags(): string[] {
  return load();
}

export function addHiddenTag(tag: string): void {
  const t = tag.trim();
  if (!t) return;
  const list = load();
  const lower = t.toLowerCase();
  if (list.some((x) => x.toLowerCase() === lower)) return;
  save([...list, t]);
}

export function removeHiddenTag(tag: string): void {
  const t = tag.trim();
  if (!t) return;
  const list = load();
  const lower = t.toLowerCase();
  save(list.filter((x) => x.toLowerCase() !== lower));
}

export function isHiddenTag(tag: string): boolean {
  const t = tag.trim();
  if (!t) return false;
  const list = load();
  const lower = t.toLowerCase();
  return list.some((x) => x.toLowerCase() === lower);
}
