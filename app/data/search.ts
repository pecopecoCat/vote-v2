import { voteCardsData } from "./voteCards";
import type { CardActivity } from "./voteCardActivity";
import { getMergedCounts } from "./voteCardActivity";

/** 注目タグ（登録数 = そのタグが付いたカード数） */
export interface TrendingTag {
  tag: string;
  /** 登録数（このタグが付いたカード数） */
  count: number;
}

/** 注目タグスコアの重み（投票 +1, コメント +3, bookmark +5, 新着 +2, タグがお気に入り +3） */
const TAG_SCORE_WEIGHTS = { vote: 1, comment: 3, bookmark: 5, new: 2, favorite: 3 } as const;
const TRENDING_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** カード配列からタグごとの登録数を集計。引数省略時は voteCardsData のみ使用 */
export function getTrendingTagsFromCards(
  cards: Array<{ tags?: string[] }> = voteCardsData
): TrendingTag[] {
  const map = new Map<string, number>();
  for (const card of cards) {
    for (const tag of card.tags ?? []) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export type CardForTagScore = {
  id?: string;
  tags?: string[];
  countA?: number;
  countB?: number;
  commentCount?: number;
  bookmarkCount?: number;
  createdAt?: string;
};

/**
 * 注目タグをスコアでランキング（タグ登録カードの engagement 合計で計算）
 * 投票 +1, コメント +3, bookmark +5, 新着 +2, タグお気に入り登録 +3
 */
export function getTrendingTagsByScore(
  cards: CardForTagScore[],
  activity: Record<string, CardActivity>,
  favoriteTagIds: string[]
): TrendingTag[] {
  const favoriteSet = new Set(favoriteTagIds);
  const tagToCount = new Map<string, number>();
  const tagToScore = new Map<string, number>();
  const now = Date.now();

  for (const card of cards) {
    const cardId = card.id ?? "";
    const act = activity[cardId] ?? { countA: 0, countB: 0, comments: [] };
    const merged = getMergedCounts(
      card.countA ?? 0,
      card.countB ?? 0,
      card.commentCount ?? 0,
      act
    );
    const votes = merged.countA + merged.countB;
    const comments = merged.commentCount;
    const bookmarks = card.bookmarkCount ?? 0;
    const createdMs = card.createdAt ? new Date(card.createdAt).getTime() : 0;
    const isNew = createdMs >= now - TRENDING_WEEK_MS;
    const cardScore =
      votes * TAG_SCORE_WEIGHTS.vote +
      comments * TAG_SCORE_WEIGHTS.comment +
      bookmarks * TAG_SCORE_WEIGHTS.bookmark +
      (isNew ? TAG_SCORE_WEIGHTS.new : 0);

    for (const tag of card.tags ?? []) {
      tagToCount.set(tag, (tagToCount.get(tag) ?? 0) + 1);
      const prev = tagToScore.get(tag) ?? 0;
      tagToScore.set(tag, prev + cardScore);
    }
  }

  for (const tag of favoriteSet) {
    if (tagToScore.has(tag)) {
      tagToScore.set(tag, (tagToScore.get(tag) ?? 0) + TAG_SCORE_WEIGHTS.favorite);
    }
  }

  return Array.from(tagToCount.entries())
    .map(([tag, count]) => ({ tag, count, score: tagToScore.get(tag) ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .map(({ tag, count }) => ({ tag, count }));
}

/** 注目タグ（登録数ベースのフォールバック。getTrendingTagsByScore を検索画面で使用） */
export const trendingTags: TrendingTag[] = getTrendingTagsFromCards();

/**
 * 指定タグと一緒に付いているタグを集計し、似たタグとして返す（先頭に指定タグ、以降は共起回数順で最大 limit 件）
 */
export function getTagsSimilarTo(
  firstTag: string,
  cards: Array<{ tags?: string[] }>,
  limit = 10
): string[] {
  const count = new Map<string, number>();
  for (const card of cards) {
    const tags = card.tags ?? [];
    if (!tags.includes(firstTag)) continue;
    for (const tag of tags) {
      if (tag === firstTag) continue;
      count.set(tag, (count.get(tag) ?? 0) + 1);
    }
  }
  const sorted = Array.from(count.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
  const result = [firstTag, ...sorted].filter((t, i, arr) => arr.indexOf(t) === i);
  return result.slice(0, limit);
}

/** コレクションのグラデーション種類 */
export type CollectionGradient =
  | "blue-cyan"
  | "pink-purple"
  | "purple-pink"
  | "orange-yellow"
  | "green-yellow"
  | "cyan-aqua";

/** 人気コレクション（public のみ。人気 = 直近1週間の2択回答数が多い順。デモでは全カードの合計で算出） */
export interface PopularCollection {
  id: string;
  title: string;
  /** グラデーション見た目 */
  gradient: CollectionGradient;
  /** ピン（注目）表示するか */
  showPin?: boolean;
  /** 人気スコア = 直近1週間で2択回答されたカードの回答数合計。デモでは全期間の countA+countB 合計 */
  voteScore: number;
}

/** コレクション用グラデーション（画像仕様の6色と対応） */
const COLLECTION_GRADIENTS: Record<
  CollectionGradient,
  string
> = {
  "blue-cyan": "from-[#707FED] to-[#A5E8ED]",
  "pink-purple": "from-[#FF6389] to-[#FC47F5]",
  "purple-pink": "from-[#FF8B8B] to-[#FF7EFA]",
  "orange-yellow": "from-[#FF4B28] to-[#FFCC0F]",
  "green-yellow": "from-[#DDEDA0] to-[#15D7A8]",
  "cyan-aqua": "from-[#CA76E8] to-[#E1CAFF]",
};

/** 全画面共通のグラデーション選択肢（Bookmark/検索/MyPage/コレクション設定で同一） */
export const COLLECTION_GRADIENT_OPTIONS: { id: CollectionGradient; start: string; end: string }[] = [
  { id: "blue-cyan", start: "#707FED", end: "#A5E8ED" },
  { id: "pink-purple", start: "#FF6389", end: "#FC47F5" },
  { id: "purple-pink", start: "#FF8B8B", end: "#FF7EFA" },
  { id: "orange-yellow", start: "#FF4B28", end: "#FFCC0F" },
  { id: "green-yellow", start: "#DDEDA0", end: "#15D7A8" },
  { id: "cyan-aqua", start: "#CA76E8", end: "#E1CAFF" },
];

/** デモ用：人気コレクション一覧（voteScore 降順で表示用） */
export const popularCollections: PopularCollection[] = [
  { id: "1", title: "究極のグルメ対決", gradient: "blue-cyan", showPin: true, voteScore: 320 },
  { id: "2", title: "ここだけで聞いてみたい、相談VOTE", gradient: "pink-purple", showPin: true, voteScore: 280 },
  { id: "3", title: "永遠に好みの猫種を選択していく2択", gradient: "purple-pink", voteScore: 250 },
  { id: "4", title: "語り合おう、懐かしもう、名作アニメなVOTE", gradient: "purple-pink", voteScore: 210 },
  { id: "5", title: "マリオなワンダーなVOTE", gradient: "orange-yellow", voteScore: 190 },
  { id: "6", title: "ランクル好きあつまれ~ 好きじゃないと伝わらない2択", gradient: "green-yellow", voteScore: 170 },
  { id: "7", title: "新のイケメンは誰? アニメキャラ2択", gradient: "cyan-aqua", voteScore: 150 },
];

export function getCollectionGradientClass(g: CollectionGradient): string {
  return COLLECTION_GRADIENTS[g] ?? "from-gray-200 to-gray-300";
}

/** コレクションの丸アイコン用：背景グラデーションを反映した style（Tailwindの動的クラスを避け確実に表示） */
export function getCollectionGradientStyle(
  gradient?: CollectionGradient | null,
  fallbackColor?: string
): { background: string } {
  if (gradient) {
    const opt = COLLECTION_GRADIENT_OPTIONS.find((o) => o.id === gradient);
    if (opt) {
      return { background: `linear-gradient(to right, ${opt.start}, ${opt.end})` };
    }
  }
  const color = fallbackColor ?? "#E5E7EB";
  return { background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)` };
}

/** 検索語に一致するタグ（部分一致） */
export function searchTags(query: string): TrendingTag[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return trendingTags.filter((t) => t.tag.toLowerCase().includes(q));
}

/** 検索語に一致するコレクション（タイトル部分一致） */
export function searchCollections(query: string): PopularCollection[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return popularCollections.filter((c) => c.title.toLowerCase().includes(q));
}
