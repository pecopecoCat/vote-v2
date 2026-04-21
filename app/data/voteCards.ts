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

export const voteCardsData: VoteCardData[] = [
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_01.png",
    question: "好きな韓国料理は？",
    optionA: "スンドゥブチゲ",
    optionB: "チヂミ",
    countA: 0,
    countB: 0,
    commentCount: 49,
    tags: ["韓国グルメ", "しめ", "ご飯"],
    readMoreText:
      "学校の授業が面白くないけど、まぁ友達と会えるのはいいかな。。。って感じだけど、みんなはどう思う？私的には給食の方が楽だし、栄養も考えられてるからいいと思うんだけどなー。",
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_01.png",
    question: "1ヶ月前離婚したばかりで再婚が決まりました。SNSでの再婚報告はあり？なし？",
    optionA: "あり",
    optionB: "なし",
    countA: 20,
    countB: 10,
    commentCount: 0,
    tags: ["相談", "結婚", "再婚"],
    readMoreText:
      "ちょっと言いづらいんだけどね。でも報告した方がいっかな？って。。",
  },
  {
    patternType: "yellow-loops",
    backgroundImageUrl: "/backgrounds/bg_02.png",
    question: "旦那が家の合鍵を義母に渡してた。相談なく。",
    optionA: "もやる",
    optionB: "別に",
    countA: 82,
    countB: 55,
    commentCount: 0,
    tags: ["相談", "旦那", "義母"],
  },
  {
    patternType: "yellow-loops",
    backgroundImageUrl: "/backgrounds/bg_02.png",
    question: "10円パンって10円だと思ってなかった？",
    optionA: "思ってた",
    optionB: "んなわきゃない",
    countA: 0,
    countB: 0,
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
    countA: 0,
    countB: 0,
    commentCount: 32,
    tags: ["ママ"],
  },
  {
    patternType: "pink-blue",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question:
      "女に好かれる女ってどっち？",
    optionA: "目立たない人",
    optionB: "人によって態度を変えない人!!",
    countA: 20,
    countB: 60,
    commentCount: 0,
    tags: ["女","性格"],
  },
  {
    patternType: "pink-blue",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question:
      "旅行って",
    optionA: "宿重視",
    optionB: "観光重視!!",
    countA: 10,
    countB: 20,
    commentCount: 0,
    tags: ["旅行","旅館","ホテル","観光"],
  },
  {
    patternType: "blue-cyan",
    backgroundImageUrl: "/backgrounds/bg_04.png",
    question: "物買う時どっち派？",
    optionA: "すぐ手に入る定価の新品",
    optionB: "中古がないか探してみる",
    countA: 0,
    countB: 0,
    commentCount: 28,
  },
  {
    patternType: "yellow-loops",
    backgroundImageUrl: "/backgrounds/bg_05.png",
    question: "割と私の周り辛いのが好きな人多くて。",
    optionA: "辛いの好き",
    optionB: "辛いの苦手",
    countA: 0,
    countB: 0,
    commentCount: 41,
  },
  {
    patternType: "orange-purple",
    backgroundImageUrl: "/backgrounds/bg_02.png",
    question: "羨ましいのはどっち？",
    optionA: "旦那さんがイケメン",
    optionB: "旦那さんがイクメン",
    countA: 0,
    countB: 0,
    commentCount: 62,
    tags: ["旦那", "ママ", "ママ友"],
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_04.png",
    question: "ママ友と飲みに行くことになりました🍷...",
    optionA: "楽しみ！",
    optionB: "ちょっと憂鬱",
    countA: 0,
    countB: 0,
    commentCount: 19,
    tags: ["ママ", "ママ友"],
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_04.png",
    question: "彼氏に1ヶ月で5キロ痩せないと別れるって言われました🥺みなさんならどちらを実施しますか？？",
    optionA: "1日置きのファスティング",
    optionB: "毎日10kmのランニング",
    countA: 40,
    countB: 20,
    commentCount: 0,
    tags: ["恋愛", "彼氏"],
  },
  {
    patternType: "pink-blue",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question: "コストコスイーツ、マストは?",
    optionA: "ティラミス",
    optionB: "マフィン",
    countA: 0,
    countB: 0,
    commentCount: 0,
    tags: ["コストコ", "スイーツ", "マフィン", "ケーキ"],
    optionAImageUrl: "/backgrounds/bg_01.png",
    optionBImageUrl: "/backgrounds/bg_02.png",
  },
  {
    patternType: "yellow-loops",
    backgroundImageUrl: "/backgrounds/bg_02.png",
    question: "小学校のお昼はどちらがいい？",
    optionA: "給食",
    optionB: "お弁当",
    countA: 0,
    countB: 0,
    commentCount: 55,
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question:
      "0〜3歳の子育てママのストレス解消法はどっち？",
    optionA: "一人の時間を作る",
    optionB: "ママ友とおしゃべり",
    countA: 0,
    countB: 0,
    commentCount: 36,
    tags: ["ママ", "ママ友"],
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question:
      "付き合いたいのは？",
    optionA: "見た目がタイプだけど性格が最悪",
    optionB: "見た目は受け付けないけど性格が最高",
    countA: 20,
    countB: 20,
    commentCount: 0,
    tags: ["恋愛", "顔が好き"],
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question:
      "パピコはんぶんこ、どっちとしたい？",
    optionA: "中村倫也",
    optionB: "松坂桃李",
    countA: 48,
    countB: 51,
    commentCount: 0,
    tags: ["妄想", "中村倫也","松坂桃李"],
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question:
      "芸能人の不倫は…",
    optionA: "不倫は悪！とことん追求してほしい！",
    optionB: "自分には1ミリも関係ないのでどうでもいい😚",
    countA: 1,
    countB: 60,
    commentCount: 0,
    tags: ["芸能人", "不倫"],
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question:
      "もう見たくない不倫芸能人は、どっち？",
    optionA: "渡部 建",
    optionB: "斉藤 慎二",
    countA: 25,
    countB: 75,
    commentCount: 0,
    tags: ["芸能人", "不倫"],
  },
  {
    patternType: "geometric-stripes",
    backgroundImageUrl: "/backgrounds/bg_03.png",
    question:
      "憧れの芸能人と一夏の恋か、自分を大切にしてくれる人との幸せな恋、どっちを選ぶ？",
    optionA: "憧れの芸能人と一夏の恋",
    optionB: "自分を大切にしてくれる人と幸せな恋",
    countA: 38,
    countB: 61,
    commentCount: 0,
    tags: ["芸能人", "恋","妄想"],
  },
];

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
