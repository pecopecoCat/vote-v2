import type { VoteCardPattern } from "../components/VoteCard";
import {
  DEFAULT_AI_AVATAR_URL,
  DEFAULT_KOUTA_AVATAR_URL,
  DEFAULT_MAMA_AVATAR_URL,
  DEFAULT_PAPA_AVATAR_URL,
  DEFAULT_RYO_AVATAR_URL,
  DEFAULT_YUI_AVATAR_URL,
} from "./avatarUrls";

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

/**
 * アプリ初期表示・デモ用の固定VOTE（ローカル・KV有無どちらでもタイムラインに並ぶ）。
 * moyatto 想定：私生活・仕事・育児・アニメ・ドラマ・アイドルのモヤモヤ2択。
 * id は一覧側で seed-0 … と付与。
 */
export const voteCardsData: VoteCardData[] = [
  /* --- 私生活 --- */
  {
    patternType: "yellow-loops",
    question: "休日の過ごし方、今の気持ちに近いのはどっち？",
    optionA: "家でゆっくりして頭を空っぽにしたい🛋️",
    optionB: "誰かと会ったり出かけて気分転換したい🚶",
    countA: 21,
    countB: 18,
    commentCount: 5,
    tags: ["私生活"],
    bookmarkCount: 6,
    createdAt: "2026-05-08T07:20:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "SNS見すぎてモヤっとする夜、どうする派？",
    optionA: "通知オフにして距離を置く📵",
    optionB: "流し見のまま「まあいいか」で寝る😮‍💨",
    countA: 14,
    countB: 19,
    commentCount: 4,
    tags: ["私生活"],
    readMoreText: "比較して落ち込む夜、わかる人いるはず。",
    bookmarkCount: 4,
    createdAt: "2026-05-08T08:10:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "一人時間 vs 誰かと過ごす時間、今欲しいのは？",
    optionA: "自分だけの時間が足りない",
    optionB: "誰かと話したい・共有したい",
    countA: 17,
    countB: 16,
    commentCount: 3,
    tags: ["私生活"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T09:00:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  /* --- 仕事 --- */
  {
    patternType: "geometric-stripes",
    question: "仕事のモヤモヤ、どう整理する派？",
    optionA: "誰かに話して外に出す🗣️",
    optionB: "一人で考えてから動く📝",
    countA: 22,
    countB: 15,
    commentCount: 6,
    tags: ["仕事"],
    bookmarkCount: 7,
    createdAt: "2026-05-08T07:45:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "残業のお誘い、断れるならどっち寄り？",
    optionA: "今日は断って自分の時間を守る",
    optionB: "流れで乗って早く片付ける",
    countA: 19,
    countB: 13,
    commentCount: 2,
    tags: ["仕事"],
    bookmarkCount: 3,
    createdAt: "2026-05-08T08:35:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "リモート vs 出社、今の気持ちに近いのは？",
    optionA: "家で集中したいリモート派🏠",
    optionB: "顔見て動きたい出社派🏢",
    countA: 16,
    countB: 20,
    commentCount: 4,
    tags: ["仕事"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T09:25:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  /* --- 育児 --- */
  {
    patternType: "pink-blue",
    question: "寝かしつけ、今日の自分に近いのはどっち？",
    optionA: "ルール通り厳しめにいく",
    optionB: "今日はゆるめで乗り切る",
    countA: 12,
    countB: 24,
    commentCount: 7,
    tags: ["育児"],
    readMoreText: "正解が毎日変わるの、育児あるある。",
    bookmarkCount: 8,
    createdAt: "2026-05-08T06:30:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "子どもの習い事、決め方はどっち寄り？",
    optionA: "本人の「やりたい」を最優先",
    optionB: "親の経験も混ぜて提案する",
    countA: 23,
    countB: 17,
    commentCount: 5,
    tags: ["育児"],
    bookmarkCount: 6,
    createdAt: "2026-05-08T07:15:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "ママ友・パパ友、今の気持ちに近いのは？",
    optionA: "もっと輪を広げたい",
    optionB: "今の関係で十分、深く少数でいい",
    countA: 15,
    countB: 18,
    commentCount: 3,
    tags: ["育児"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T08:50:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  /* --- アニメ --- */
  {
    patternType: "yellow-loops",
    question: "今期アニメ、見るペースはどっち？",
    optionA: "放送日に我慢して追う📅",
    optionB: "気になったら一気見しちゃう🍿",
    countA: 15,
    countB: 27,
    commentCount: 4,
    tags: ["アニメ"],
    bookmarkCount: 6,
    createdAt: "2026-05-08T10:05:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "アニメ、原作と映像どっち先？",
    optionA: "原作読んでからアニメ📚",
    optionB: "映像の衝撃を先に味わう✨",
    countA: 20,
    countB: 16,
    commentCount: 3,
    tags: ["アニメ"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T10:40:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "推しキャラの活躍シーン、見返す派？",
    optionA: "何度も見返して余韻に浸る",
    optionB: "一度で十分、次の話へ進む",
    countA: 18,
    countB: 14,
    commentCount: 2,
    tags: ["アニメ"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T11:15:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  /* --- ドラマ --- */
  {
    patternType: "blue-cyan",
    question: "ドラマ、見るタイミングはどっち？",
    optionA: "最終回まで溜めて一気見📦",
    optionB: "気になったらその日のうちに🏃",
    countA: 12,
    countB: 25,
    commentCount: 4,
    tags: ["ドラマ"],
    bookmarkCount: 5,
    createdAt: "2026-05-09T08:00:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "恋愛ドラマ、今欲しい温度感は？",
    optionA: "甘々・胸キュンで癒されたい💕",
    optionB: "リアル寄りでモヤモヤごと味わう🎭",
    countA: 24,
    countB: 16,
    commentCount: 5,
    tags: ["ドラマ"],
    bookmarkCount: 5,
    createdAt: "2026-05-09T08:30:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "実写化作品、基本どっちのスタンス？",
    optionA: "原作ファンとして見に行く🎬",
    optionB: "映像は別作品として楽しむ",
    countA: 19,
    countB: 17,
    commentCount: 6,
    tags: ["ドラマ"],
    readMoreText: "「原作が好きだから」も「別物として楽しむ」も、どちらも立派。",
    bookmarkCount: 6,
    createdAt: "2026-05-09T09:00:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  /* --- アイドル --- */
  {
    patternType: "orange-purple",
    question: "推し活のお金、今優先したいのは？",
    optionA: "現場・チケットに回す📣",
    optionB: "グッズで推し愛を形にする📸",
    countA: 28,
    countB: 24,
    commentCount: 7,
    tags: ["アイドル"],
    readMoreText: "貯金とも喧嘩しがち。正解はないタイプのモヤモヤ。",
    bookmarkCount: 9,
    createdAt: "2026-05-08T03:05:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "推しコンテンツ、チェックの仕方は？",
    optionA: "公式・メディア速報だけ追う",
    optionB: "ファンのタイムラインも含めて賑わい視聴",
    countA: 17,
    countB: 26,
    commentCount: 5,
    tags: ["アイドル"],
    bookmarkCount: 7,
    createdAt: "2026-05-08T06:02:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "推しの見せ方、今の気持ちに近いのは？",
    optionA: "センター・単推しに集中👑",
    optionB: "グループ全体のバランスを愛でる🌈",
    countA: 22,
    countB: 20,
    commentCount: 4,
    tags: ["アイドル"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T11:00:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
];

/** 旧デモ用「⚠️パパ閲覧注意」シード（現在は未使用） */
export const SEED_PAPA_WARNING_CARD_COUNT = 0;

export function getSeedPapaWarningCardIds(): string[] {
  const n = SEED_PAPA_WARNING_CARD_COUNT;
  const len = voteCardsData.length;
  if (len < n) return [];
  return Array.from({ length: n }, (_, i) => `seed-${len - n + i}`);
}

/** コミュニティ用：指定タグのシードカード id 一覧 */
export function getSeedCardIdsByTag(tag: string): string[] {
  return voteCardsData
    .filter((c) => (c.tags ?? []).includes(tag))
    .map((c) => resolveStableVoteCardId(c));
}

/** @deprecated 旧入門コレ用。getSeedCardIdsByTag を使用 */
export function getSeedClassicCardIds(): string[] {
  return getSeedCardIdsByTag("アニメ");
}

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
  "私生活",
  "仕事",
  "育児",
  "アニメ",
  "アイドル",
  "ドラマ",
  "推し活",
  "一気見",
  "モヤモヤ",
];
