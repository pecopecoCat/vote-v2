export function normalizeCardIdKey(cardId: string): string {
  if (cardId.startsWith("seed-") || cardId.startsWith("created-")) return cardId;
  const n = parseInt(cardId, 10);
  if (!Number.isNaN(n) && String(n) === cardId && n >= 0) return `seed-${n}`;
  return cardId;
}

export function normalizeKeyedRows<T>(raw: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[normalizeCardIdKey(k)] = v;
  }
  return out;
}

export function resolveAvatarSrc(iconUrl: unknown): string {
  if (typeof iconUrl !== "string") return "/default-avatar.png";
  const v = iconUrl.trim();
  if (!v) return "/default-avatar.png";
  if (v === "undefined" || v === "null") return "/default-avatar.png";
  // Safari 等で //host/... が相対パス扱いになり読み込めないことがある
  if (v.startsWith("//")) return `https:${v}`;
  return v;
}

/** Google / X 等の CDN が Referrer 付き GET を拒否する場合がある（Safari で顕著になりやすい） */
export function isRemoteHttpUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

