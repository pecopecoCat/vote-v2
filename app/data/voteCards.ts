import type { VoteCardPattern } from "../components/VoteCard";

export interface VoteCardData {
  patternType: VoteCardPattern;
  question: string;
  optionA: string;
  optionB: string;
  countA: number;
  countB: number;
  commentCount: number;
  tags?: string[];
  readMoreText?: string;
  creator?: { name: string; iconUrl?: string };
  /** ブックマーク済みか（タップでトグルされるフラグ） */
  bookmarked?: boolean;
  /** ブックマーク数（急上昇ポイント計算用。未設定時は0扱い） */
  bookmarkCount?: number;
  /** 作成日（ISO文字列）。新着ソート用 */
  createdAt?: string;
  /** 背景画像URL（指定時は pattern の代わりに画像を使用） */
  backgroundImageUrl?: string;
  /** 一意ID（作成カードの識別・ブックマーク用） */
  id?: string;
  /** public: みんな見れる / private: リンクを知ってる人だけ見れる（擬似） */
  visibility?: "public" | "private";
  /** 作成者ユーザーID（API共有時・マイページ「作ったVOTE」のフィルタ用） */
  createdByUserId?: string;
  /** Aの画像URL（指定時はカード内にA/B画像エリアを表示） */
  optionAImageUrl?: string;
  /** Bの画像URL */
  optionBImageUrl?: string;
  /** 投票期間開始日時（ISO文字列）。未設定で periodEnd のみのときは終了まで投票可 */
  periodStart?: string;
  /** 投票期間終了日時（ISO文字列）。お知らせ「設定した投票期間が終わりました」用 */
  periodEnd?: string;
  /** true のときコメント投稿不可（作成時「コメントを求めない」） */
  commentsDisabled?: boolean;
}

export const voteCardsData: VoteCardData[] = []; // デフォルト登録のシードVOTEなし（ユーザー作成・APIのみ）


const VOTE_SEED_KEY_TO_ID: Map<string, string> = (() => {
  const m = new Map<string, string>();
  voteCardsData.forEach((c, i) => {
    m.set(`${c.question}\0${c.optionA}\0${c.optionB}`, `seed-${i}`);
  });
  return m;
})();

/**
 * シードカードの安定 ID（一覧レンダーでの `indexOf` / `findIndex` 連打を避ける）。
 * 作成カードは `id` が付いている想定でそのまま返す。
 */
export function resolveStableVoteCardId(card: VoteCardData): string {
  if (typeof card.id === "string" && card.id.length > 0) return card.id;
  return VOTE_SEED_KEY_TO_ID.get(`${card.question}\0${card.optionA}\0${card.optionB}`) ?? "seed-0";
}

export function getVoteCardById(id: string): VoteCardData | null {
  const index = parseInt(id, 10);
  if (Number.isNaN(index) || index < 0 || index >= voteCardsData.length) return null;
  return voteCardsData[index];
}

/** 関連VOTE: 同じタグを1つ以上持ち、かつアクション（投票 or コメント）があるカード。currentId を除く。 */
export function getRelatedVoteCards(
  currentCard: VoteCardData,
  allCards: VoteCardData[],
  currentId: string,
  limit = 5
): VoteCardData[] {
  const currentTags = new Set(currentCard.tags ?? []);
  const hasActivity = (c: VoteCardData) =>
    c.countA + c.countB > 0 || c.commentCount > 0;
  const sharesTag = (c: VoteCardData) =>
    (c.tags ?? []).some((t) => currentTags.has(t));
  const id = (c: VoteCardData) => c.id ?? c.question;
  return allCards
    .filter(
      (c) => id(c) !== currentId && sharesTag(c) && hasActivity(c)
    )
    .slice(0, limit);
}

/**
 * コメントページ下部の関連VOTE用。
 * 現在カードのタグを **先頭から順** に試し、同じタグ文字列を持つ他カードを新着順で最大 `limit` 件まで集める。
 * 1番目のタグで取り切ったあと足りなければ2番目のタグで未採用分を埋める（重複なし）。
 */
export function getRelatedVoteCardsByTagPriority(
  currentCard: VoteCardData,
  allCards: VoteCardData[],
  currentId: string,
  limit = 10
): VoteCardData[] {
  const cardId = (c: VoteCardData) => c.id ?? c.question;
  const tags = currentCard.tags ?? [];
  if (tags.length === 0 || limit <= 0) return [];

  const others = allCards
    .filter((c) => cardId(c) !== currentId)
    .sort((a, b) => (b.createdAt ?? "0").localeCompare(a.createdAt ?? "0"));

  const seen = new Set<string>();
  const out: VoteCardData[] = [];

  for (const tag of tags) {
    if (out.length >= limit) break;
    for (const c of others) {
      if (out.length >= limit) break;
      const cid = cardId(c);
      if (seen.has(cid)) continue;
      if ((c.tags ?? []).includes(tag)) {
        out.push(c);
        seen.add(cid);
      }
    }
  }

  return out;
}

/** 新着順でカードを返す（関連VOTEが0件のときのフォールバック用）。currentId と excludeCardIds を除く。 */
export function getNewestVoteCards(
  allCards: VoteCardData[],
  currentId: string,
  limit = 5,
  excludeCardIds?: Set<string>
): VoteCardData[] {
  const id = (c: VoteCardData) => c.id ?? c.question;
  const exclude = excludeCardIds ?? new Set<string>();
  return [...allCards]
    .filter((c) => {
      const cid = id(c);
      if (cid === currentId) return false;
      if (exclude.has(cid)) return false;
      return true;
    })
    .sort((a, b) => (b.createdAt ?? "0").localeCompare(a.createdAt ?? "0"))
    .slice(0, limit);
}

/** 背景画像一覧（VOTE作成時の選択肢・カード表示用・public/backgrounds に存在するもののみ） */
export const CARD_BACKGROUND_IMAGES = [
  "/backgrounds/bg_01.png",
  "/backgrounds/bg_02.png",
  "/backgrounds/bg_03.png",
  "/backgrounds/bg_04.png",
  "/backgrounds/bg_05.png",
  "/backgrounds/bg_06.png",
  "/backgrounds/bg_07.png",
  "/backgrounds/bg_08.png",
  "/backgrounds/bg_09.png",
  "/backgrounds/bg_10.png",
  "/backgrounds/bg_11.png",
  "/backgrounds/bg_12.png",
  "/backgrounds/bg_13.png",
  "/backgrounds/bg_15.png",
  "/backgrounds/bg_16.png",
  "/backgrounds/bg_17.png",
  "/backgrounds/grd_01.png",
  "/backgrounds/grd_02.png",
  "/backgrounds/grd_03.png",
  "/backgrounds/grd_04.png",
  "/backgrounds/grd_05.png",
  "/backgrounds/grd_06.png",
  "/backgrounds/grd_07.png",
  "/backgrounds/grd_08.png",
] as const;

export const recommendedTagList = [
  "キャンプ",
  "韓国グルメ",
  "家の飯",
  "グルメ",
  "BBQ",
  "アウトドア",
  "乳液",
  "料理な2択",
];
