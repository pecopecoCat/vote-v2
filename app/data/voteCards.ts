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
 * 日本のPOPカルチャー（アニメ・アイドル・ドラマ）のみ。
 * id は一覧側で seed-0 … と付与。
 */
export const voteCardsData: VoteCardData[] = [
  /* --- アニメ --- */
  {
    patternType: "yellow-loops",
    question: "アニメ、まず新作は原作を読んでから見る派？",
    optionA: "原作読んでネタバレ耐性つけてからアニメ📚",
    optionB: "ひとまず無知のまま映像だけ楽しむ派✨",
    countA: 23,
    countB: 19,
    commentCount: 6,
    tags: ["アニメ", "入門"],
    bookmarkCount: 8,
    createdAt: "2026-05-08T07:20:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "好きな作品の劇場版、応援上映に行けるならどっち寄り？",
    optionA: "うちわ・コールOKのヒート上映🔥",
    optionB: "静かにスクリーン没入タイプ😶",
    countA: 11,
    countB: 15,
    commentCount: 2,
    tags: ["アニメ"],
    bookmarkCount: 3,
    createdAt: "2026-05-08T07:55:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "アニメ視聴、配信サービスは複数契約派？",
    optionA: "見たいがあるサブスクを全部チェック📺",
    optionB: "1つの定額だけに収めたい節約脳💴",
    countA: 18,
    countB: 14,
    commentCount: 1,
    tags: ["アニメ"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T08:30:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "週放送アニメ、溜めてから一気見 vs 放送日にしか見られない？",
    optionA: "最終回放送までギリ耐えられる我慢強い📅",
    optionB: "もう気になって全部イッキ見しちゃう🍿",
    countA: 15,
    countB: 27,
    commentCount: 4,
    tags: ["アニメ", "一気見"],
    bookmarkCount: 6,
    createdAt: "2026-05-08T09:05:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "神作画だった回、あとでもう一度見ちゃう？",
    optionA: "リピートしまくって作画と音を味わう",
    optionB: "一度で十分、その余韻を大事に保管派",
    countA: 20,
    countB: 12,
    commentCount: 3,
    tags: ["アニメ"],
    readMoreText: "スクショ禁止のときほどまた見たくなる問題。",
    bookmarkCount: 5,
    createdAt: "2026-05-08T09:42:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "アニソン、通勤プレイリストにはどっちを増やしたい？",
    optionA: "TVサイズ・アニポジの王道でテンション上げ📱",
    optionB: "フル・アレンジ盤まで含め網羅したい📀",
    countA: 13,
    countB: 18,
    commentCount: 2,
    tags: ["アニメ", "アニソン"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T10:18:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  /* --- アイドル --- */
  {
    patternType: "orange-purple",
    question: "推しへの応援資金の使い方、どちら優先度高い？",
    optionA: "現場に行ける分はチケット・交通費に回す📣",
    optionB: "グッズとトレカで推し愛を語る📸",
    countA: 28,
    countB: 24,
    commentCount: 7,
    tags: ["アイドル", "推し活", "入門"],
    readMoreText: "貯金とも喧嘩しがち。この2択は永遠に結論が出ないタイプです。",
    bookmarkCount: 9,
    createdAt: "2026-05-08T03:05:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "初めてのアイドル現場、ペンライトカラーはどっち？",
    optionA: "公式カラーだけ推し単色で統一★",
    optionB: "推し複数なら複数色ゆらぎレインボー派🌈",
    countA: 19,
    countB: 22,
    commentCount: 4,
    tags: ["アイドル", "現場参戦"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T03:40:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "リリイベ・特典会、並ぶならタイプはどっち？",
    optionA: "開場前から整列耐久・推しとの距離命🎤",
    optionB: "無理しない程度でゆる～く参加😌",
    countA: 14,
    countB: 17,
    commentCount: 3,
    tags: ["アイドル"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T05:15:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "生写真・トレカの保管、アルバム整理は？",
    optionA: "スリーブ厳選・セットごとページ分け派",
    optionB: "とりあえず宝箱にぎゅうぎゅう派📦",
    countA: 21,
    countB: 16,
    commentCount: 2,
    tags: ["アイドル"],
    readMoreText: "完璧主義ツラい、でもゆるゆるだと見つからない問題。どっちでも正解。",
    bookmarkCount: 6,
    createdAt: "2026-05-08T06:02:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "推しコンテンツ、最新はどこでチェックしますか？",
    optionA: "公式・メディア速報だけ追う硬派派",
    optionB: "ファンタイムライン込み賑わい視聴パ🐦",
    countA: 17,
    countB: 26,
    commentCount: 5,
    tags: ["アイドル", "推し活"],
    bookmarkCount: 7,
    createdAt: "2026-05-08T06:48:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "推しの見せ方、センター推し派？全体推し派？",
    optionA: "センター・単推しに全集中👑",
    optionB: "グループ全体のバランスを愛でる🌈",
    countA: 22,
    countB: 20,
    commentCount: 4,
    tags: ["アイドル"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T11:00:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  /* --- ドラマ --- */
  {
    patternType: "pink-blue",
    question: "ドラマの見方、朝ドラ派？夜ドラ派？",
    optionA: "朝の習慣に組み込む朝ドラ生活☀️",
    optionB: "夜のゴールデン帯・配信でじっくり🌙",
    countA: 16,
    countB: 21,
    commentCount: 3,
    tags: ["ドラマ", "入門"],
    bookmarkCount: 4,
    createdAt: "2026-05-09T08:00:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "連続ドラマ、見るペースはどっち？",
    optionA: "放送週は我慢して最終回まで溜める📦",
    optionB: "気になったらその日のうちに追いかける🏃",
    countA: 12,
    countB: 25,
    commentCount: 4,
    tags: ["ドラマ", "一気見"],
    bookmarkCount: 5,
    createdAt: "2026-05-09T08:15:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "漫画・小説の実写化、基本どっち？",
    optionA: "原作ファンとしてちゃんと見に行く🎬",
    optionB: "原作は原作、映像は別作品として切り離す",
    countA: 19,
    countB: 17,
    commentCount: 6,
    tags: ["ドラマ", "実写化"],
    readMoreText: "「原作が好きだから」も「別物として楽しむ」も、どちらも立派な見方です。",
    bookmarkCount: 6,
    createdAt: "2026-05-09T08:30:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "最近のドラマ、主戦場はどっち寄り？",
    optionA: "国内ドラマ・日ドラが本命🇯🇵",
    optionB: "韓国ドラマ・海外ドラマも積極的に🌏",
    countA: 20,
    countB: 18,
    commentCount: 3,
    tags: ["ドラマ"],
    bookmarkCount: 4,
    createdAt: "2026-05-09T08:45:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "恋愛ドラマ、好みの温度感はどっち？",
    optionA: "甘々・胸キュン全開で癒されたい💕",
    optionB: "リアル寄り・人間ドラマで泣きたい🎭",
    countA: 24,
    countB: 16,
    commentCount: 5,
    tags: ["ドラマ"],
    bookmarkCount: 5,
    createdAt: "2026-05-09T09:00:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "ドラマの視聴スタイル、リアタイ派？一気見派？",
    optionA: "テレビ・配信の放送日に合わせて見る📺",
    optionB: "サブスクで自分のペースで一気見🍿",
    countA: 14,
    countB: 23,
    commentCount: 2,
    tags: ["ドラマ"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T09:15:00.000Z",
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

/** 入門コレ（入門タグのシードカードのみ） */
export function getSeedClassicCardIds(): string[] {
  return voteCardsData
    .filter((c) => (c.tags ?? []).includes("入門"))
    .map((c) => resolveStableVoteCardId(c));
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
  "アニメ",
  "アイドル",
  "ドラマ",
  "推し活",
  "一気見",
  "現場参戦",
  "アニソン",
  "実写化",
  "2.5次元",
  "日ドラ",
];
