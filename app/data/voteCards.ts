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
  /** 作成日（ISO文字列）。新着ソート用 */
  createdAt?: string;
  /** 背景画像URL（指定時は pattern の代わりに画像を使用） */
  backgroundImageUrl?: string;
  /** 一意ID（作成カードの識別・ブックマーク用） */
  id?: string;
}

export const voteCardsData: VoteCardData[] = [
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_01.png",
    question: "好きな韓国料理は？",
    optionA: "スンドゥブチゲ",
    optionB: "チヂミ",
    countA: 82,
    countB: 54,
    commentCount: 49,
    tags: ["韓国グルメ", "しめ", "ご飯"],
    readMoreText:
      "学校の授業が面白くないけど、まぁ友達と会えるのはいいかな。。。って感じだけど、みんなはどう思う？私的には給食の方が楽だし、栄養も考えられてるからいいと思うんだけどなー。",
  },
  {
    patternType: "yellow-loops",
    backgroundImageUrl: "/backgrounds/bg_02.png",
    question: "10円パンって10円だと思ってなかった？",
    optionA: "思ってた",
    optionB: "んなわきゃない",
    countA: 104,
    countB: 69,
    commentCount: 75,
    tags: ["10円パン"],
  },
  {
    patternType: "pink-blue",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question:
      "未就学児の子育てママに質問 ☆ 1人時間を作ってますか??",
    optionA: "自分の時間よりとりあえず睡眠確保",
    optionB: "睡眠削ってでも、好きな事したい時間を作る!!",
    countA: 53,
    countB: 36,
    commentCount: 32,
  },
  {
    patternType: "blue-cyan",
    backgroundImageUrl: "/backgrounds/bg_04.png",
    question: "物買う時どっち派？",
    optionA: "すぐ手に入る定価の新品",
    optionB: "中古がないか探してみる",
    countA: 67,
    countB: 45,
    commentCount: 28,
  },
  {
    patternType: "yellow-loops",
    backgroundImageUrl: "/backgrounds/bg_05.png",
    question: "割と私の周り辛いのが好きな人多くて。",
    optionA: "辛いの好き",
    optionB: "辛いの苦手",
    countA: 57,
    countB: 38,
    commentCount: 41,
  },
  {
    patternType: "orange-purple",
    backgroundImageUrl: "/backgrounds/bg_02.png",
    question: "羨ましいのはどっち？",
    optionA: "旦那さんがイケメン",
    optionB: "旦那さんがイクメン",
    countA: 94,
    countB: 62,
    commentCount: 62,
    tags: ["旦那", "ママ友"],
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_04.png",
    question: "ママ友と飲みに行くことになりました🍷...",
    optionA: "楽しみ！",
    optionB: "ちょっと憂鬱",
    countA: 47,
    countB: 31,
    commentCount: 19,
  },
  {
    patternType: "yellow-loops",
    backgroundImageUrl: "/backgrounds/bg_02.png",
    question: "小学校のお昼はどちらがいい？",
    optionA: "給食",
    optionB: "お弁当",
    countA: 80,
    countB: 54,
    commentCount: 55,
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question:
      "0〜3歳の子育てママのストレス解消法はどっち？",
    optionA: "一人の時間を作る",
    optionB: "ママ友とおしゃべり",
    countA: 59,
    countB: 39,
    commentCount: 36,
  },
];

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

/** 新着順でカードを返す（関連VOTEが0件のときのフォールバック用）。currentId を除く。 */
export function getNewestVoteCards(
  allCards: VoteCardData[],
  currentId: string,
  limit = 5
): VoteCardData[] {
  const id = (c: VoteCardData) => c.id ?? c.question;
  return [...allCards]
    .filter((c) => id(c) !== currentId)
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
