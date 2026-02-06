import { voteCardsData } from "./voteCards";

/** 注目タグ（登録数 = そのタグが付いたカード数。直近1週間集計想定のデモでは全期間で算出） */
export interface TrendingTag {
  tag: string;
  /** 登録数（このタグが付いたカード数） */
  count: number;
}

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

/** 注目タグ（実際のカードデータから集計。登録数も実数） */
export const trendingTags: TrendingTag[] = getTrendingTagsFromCards();

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

const COLLECTION_GRADIENTS: Record<
  CollectionGradient,
  string
> = {
  "blue-cyan": "from-[#7dd3fc] to-[#e0f2fe]",
  "pink-purple": "from-[#f9a8d4] to-[#e879f9]",
  "purple-pink": "from-[#c084fc] to-[#f472b6]",
  "orange-yellow": "from-[#fb923c] to-[#fde047]",
  "green-yellow": "from-[#a3e635] to-[#d9f99d]",
  "cyan-aqua": "from-[#67e8f9] to-[#a5f3fc]",
};

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
