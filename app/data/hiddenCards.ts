/**
 * 非表示にしたカードID一覧（3点リーダー「非表示にする」用）
 * 作成者がいないシードカードなどはユーザー非表示が使えないため、カードIDで非表示を記録。
 * localStorage で永続化。
 */

const STORAGE_KEY = "vote_hidden_card_ids";
const EVENT_NAME = "vote_hidden_cards_updated";

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

export function getHiddenCardIds(): string[] {
  return load();
}

export function addHiddenCard(cardId: string): void {
  const ids = load();
  if (ids.includes(cardId)) return;
  save([...ids, cardId]);
}

export function getHiddenCardsUpdatedEventName(): string {
  return EVENT_NAME;
}
