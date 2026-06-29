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
 * アニメ・漫画特化：作品・テーマ別コミュニティの「もやっと」2択。
 * id は一覧側で seed-0 … seed-56 と付与（57件）。
 */
export const SEED_TAG_CHAO = "ちゃお";
export const SEED_TAG_RECENT_ANIME = "最近見たアニメ";
export const SEED_TAG_NOSTALGIC_ANIME = "懐かしいアニメ";
export const SEED_TAG_LIVE_ACTION = "実写化";

export const voteCardsData: VoteCardData[] = [
  /* --- ワンピース --- */
  {
    patternType: "yellow-loops",
    question: "海賊王を目指す物語、今の追い方は？",
    optionA: "週刊・休載明けも追い続ける",
    optionB: "好きなところだけまとめて読む",
    countA: 14,
    countB: 12,
    commentCount: 3,
    tags: ["ワンピース"],
    bookmarkCount: 3,
    createdAt: "2026-05-08T10:00:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "仲間との絆 vs 夢の達成、どっちに心動く？",
    optionA: "絆のシーンで泣ける",
    optionB: "夢に向かう姿に燃える",
    countA: 17,
    countB: 17,
    commentCount: 4,
    tags: ["ワンピース"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T11:07:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "長すぎ問題、あなたは？",
    optionA: "長いからこそ魅力",
    optionB: "途中で離脱したことある",
    countA: 20,
    countB: 22,
    commentCount: 5,
    tags: ["ワンピース"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T12:14:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "悪役・敵キャラにも魅力感じる？",
    optionA: "敵も含めて全部好き",
    optionB: "主人公サイド一択",
    countA: 23,
    countB: 27,
    commentCount: 6,
    tags: ["ワンピース"],
    bookmarkCount: 6,
    createdAt: "2026-05-08T13:21:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "伏線回収、どう楽しむ？",
    optionA: "考察コミュニティで盛り上がる",
    optionB: "一人で気づいた瞬間が好き",
    countA: 26,
    countB: 12,
    commentCount: 7,
    tags: ["ワンピース"],
    bookmarkCount: 7,
    createdAt: "2026-05-08T14:28:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "アニメの声優演技、どう感じる？",
    optionA: "原作以上に好きな場面ある",
    optionB: "漫画のイメージが最強",
    countA: 29,
    countB: 17,
    commentCount: 3,
    tags: ["ワンピース"],
    bookmarkCount: 8,
    createdAt: "2026-05-08T15:35:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "仲間が増えるたび、嬉しい？",
    optionA: "新メンバーも全部推せる",
    optionB: "昔のメンバーが一番恋しい",
    countA: 14,
    countB: 22,
    commentCount: 4,
    tags: ["ワンピース"],
    bookmarkCount: 3,
    createdAt: "2026-05-08T16:42:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  /* --- 鬼滅の刃 --- */
  {
    patternType: "blue-cyan",
    question: "刀の技 vs 血鬼術、どっちがカッコいい？",
    optionA: "刀と呼吸の技⚔️",
    optionB: "血鬼術の異質さ👹",
    countA: 17,
    countB: 27,
    commentCount: 5,
    tags: ["鬼滅の刃"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T17:49:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "アニメの作画クオリ、どう思う？",
    optionA: "映画級で圧倒される",
    optionB: "好みは分かれるけど見る",
    countA: 20,
    countB: 12,
    commentCount: 6,
    tags: ["鬼滅の刃"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T18:56:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "泣けるシーン、何度見る？",
    optionA: "何度も見返す",
    optionB: "一度だけで十分",
    countA: 23,
    countB: 17,
    commentCount: 7,
    tags: ["鬼滅の刃"],
    bookmarkCount: 6,
    createdAt: "2026-05-08T19:03:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "柱キャラ、推しはいる？",
    optionA: "推しがいて語りたい",
    optionB: "全員カッコよすぎて選べない",
    countA: 26,
    countB: 22,
    commentCount: 3,
    tags: ["鬼滅の刃"],
    bookmarkCount: 7,
    createdAt: "2026-05-08T20:10:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "漫画から？アニメから？",
    optionA: "漫画先に読んだ",
    optionB: "アニメで一気に好きになった",
    countA: 29,
    countB: 27,
    commentCount: 4,
    tags: ["鬼滅の刃"],
    bookmarkCount: 8,
    createdAt: "2026-05-08T21:17:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "グッズ、買う派？",
    optionA: "買う・集めたい",
    optionB: "作品で十分",
    countA: 14,
    countB: 12,
    commentCount: 5,
    tags: ["鬼滅の刃"],
    bookmarkCount: 3,
    createdAt: "2026-05-08T10:24:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "最終的な結末、今の気持ちは？",
    optionA: "納得してる",
    optionB: "まだモヤモヤ残ってる",
    countA: 17,
    countB: 17,
    commentCount: 6,
    tags: ["鬼滅の刃"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T11:31:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  /* --- 葬送のフリーレン --- */
  {
    patternType: "orange-purple",
    question: "旅の「ゆるさ」vs「切なさ」、どっちが刺さる？",
    optionA: "ゆったりした空気感",
    optionB: "じわじわくる切なさ",
    countA: 20,
    countB: 22,
    commentCount: 7,
    tags: ["葬送のフリーレン"],
    bookmarkCount: 5,
    createdAt: "2026-05-09T12:38:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "魔法のイメージ、どっち寄り？",
    optionA: "日々の積み重ねが大事",
    optionB: "一発逆転の大技も好き",
    countA: 23,
    countB: 27,
    commentCount: 3,
    tags: ["葬送のフリーレン"],
    bookmarkCount: 6,
    createdAt: "2026-05-09T13:45:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "アニメの音楽、どう感じる？",
    optionA: "世界観に完全フィット",
    optionB: "普通に良いけど特別感は人それぞれ",
    countA: 26,
    countB: 12,
    commentCount: 4,
    tags: ["葬送のフリーレン"],
    bookmarkCount: 7,
    createdAt: "2026-05-09T14:52:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "フェルン派？フリーレン派？",
    optionA: "フェルン推し",
    optionB: "フリーレン推し",
    countA: 29,
    countB: 17,
    commentCount: 5,
    tags: ["葬送のフリーレン"],
    bookmarkCount: 8,
    createdAt: "2026-05-09T15:59:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "テンポの遅さ、どう？",
    optionA: "じっくりが最高",
    optionB: "たまにもう少し早くても",
    countA: 14,
    countB: 22,
    commentCount: 6,
    tags: ["葬送のフリーレン"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T16:06:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "同じ作者の次作、見る？",
    optionA: "絶対チェックする",
    optionB: "この作品だけで十分満足",
    countA: 17,
    countB: 27,
    commentCount: 7,
    tags: ["葬送のフリーレン"],
    bookmarkCount: 4,
    createdAt: "2026-05-09T17:13:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  /* --- 薬屋のひとりごと --- */
  {
    patternType: "yellow-loops",
    question: "猫猫の推理、どう楽しむ？",
    optionA: "一緒に考えたい🐱",
    optionB: "解決されるのを待つのが好き",
    countA: 20,
    countB: 12,
    commentCount: 3,
    tags: ["薬屋のひとりごと"],
    bookmarkCount: 5,
    createdAt: "2026-05-09T18:20:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "後宮×ミステリー設定、どう？",
    optionA: "新鮮でハマった",
    optionB: "ちょっと苦手な部分もある",
    countA: 23,
    countB: 17,
    commentCount: 4,
    tags: ["薬屋のひとりごと"],
    bookmarkCount: 6,
    createdAt: "2026-05-09T19:27:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "原作、どっちから入った？",
    optionA: "ライトノベル先📚",
    optionB: "アニメ先🎬",
    countA: 26,
    countB: 22,
    commentCount: 5,
    tags: ["薬屋のひとりごと"],
    bookmarkCount: 7,
    createdAt: "2026-05-09T20:34:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "猫猫と壬氏、どっち推し？",
    optionA: "猫猫一択",
    optionB: "壬氏も捨てがたい",
    countA: 29,
    countB: 27,
    commentCount: 6,
    tags: ["薬屋のひとりごと"],
    bookmarkCount: 8,
    createdAt: "2026-05-09T21:41:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "ミステリー要素の量、どう？",
    optionA: "もっと欲しい",
    optionB: "今のバランスが最高",
    countA: 14,
    countB: 12,
    commentCount: 7,
    tags: ["薬屋のひとりごと"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T10:48:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "中国風ファンタジー、他も見る？",
    optionA: "似た作品も探す",
    optionB: "この作品だけ特別",
    countA: 17,
    countB: 17,
    commentCount: 3,
    tags: ["薬屋のひとりごと"],
    bookmarkCount: 4,
    createdAt: "2026-05-09T11:55:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  /* --- ダンダダン --- */
  {
    patternType: "pink-blue",
    question: "オカルト×恋愛、どっち要素が好き？",
    optionA: "オカルト・バトル👽",
    optionB: "恋愛・キャラ関係💕",
    countA: 20,
    countB: 22,
    commentCount: 4,
    tags: ["ダンダダン"],
    bookmarkCount: 5,
    createdAt: "2026-05-10T12:02:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "テンポの速さ、どう？",
    optionA: "最高にハマる",
    optionB: "たまに疲れる",
    countA: 23,
    countB: 27,
    commentCount: 5,
    tags: ["ダンダダン"],
    bookmarkCount: 6,
    createdAt: "2026-05-10T13:09:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "絵の勢い・エネルギー、好き？",
    optionA: "パネルから伝わって好き",
    optionB: "好みは分かれる",
    countA: 26,
    countB: 12,
    commentCount: 6,
    tags: ["ダンダダン"],
    bookmarkCount: 7,
    createdAt: "2026-05-10T14:16:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "アニメと漫画、どっち派？",
    optionA: "アニメの方が好き",
    optionB: "漫画の勢いがそのままで好き",
    countA: 29,
    countB: 17,
    commentCount: 7,
    tags: ["ダンダダン"],
    bookmarkCount: 8,
    createdAt: "2026-05-10T15:23:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "バトルとギャグのバランス？",
    optionA: "今のままでバッチリ",
    optionB: "もう少し整えてほしい",
    countA: 14,
    countB: 22,
    commentCount: 3,
    tags: ["ダンダダン"],
    bookmarkCount: 3,
    createdAt: "2026-05-10T16:30:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "友人に勧めたい？",
    optionA: "勧めたい！",
    optionB: "好みが分かれそうで怖い",
    countA: 17,
    countB: 27,
    commentCount: 4,
    tags: ["ダンダダン"],
    bookmarkCount: 4,
    createdAt: "2026-05-10T17:37:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "続き、毎週の楽しみ方は？",
    optionA: "放送日に我慢して見る",
    optionB: "溜めて一気見",
    countA: 20,
    countB: 12,
    commentCount: 5,
    tags: ["ダンダダン"],
    bookmarkCount: 5,
    createdAt: "2026-05-10T18:44:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  /* --- ちゃお --- */
  {
    patternType: "geometric-stripes",
    question: "ちゃお、今も読んでる？",
    optionA: "現役で毎月チェック💕",
    optionB: "大人になってもたまに買う",
    countA: 23,
    countB: 17,
    commentCount: 6,
    tags: [SEED_TAG_CHAO],
    bookmarkCount: 6,
    createdAt: "2026-05-11T19:51:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "付録ステキ、どうしてる？",
    optionA: "全部大事に飾る✨",
    optionB: "思い出だけ残して手放す",
    countA: 26,
    countB: 22,
    commentCount: 7,
    tags: [SEED_TAG_CHAO],
    bookmarkCount: 7,
    createdAt: "2026-05-11T20:58:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "推しキャラ、変わったことある？",
    optionA: "何度も変わった",
    optionB: "昔の推しが今も最強",
    countA: 29,
    countB: 27,
    commentCount: 3,
    tags: [SEED_TAG_CHAO],
    bookmarkCount: 8,
    createdAt: "2026-05-11T21:05:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "電子版 vs 紙、どっち？",
    optionA: "紙の付録がないと無理",
    optionB: "電子で十分読める",
    countA: 14,
    countB: 12,
    commentCount: 4,
    tags: [SEED_TAG_CHAO],
    bookmarkCount: 3,
    createdAt: "2026-05-11T10:12:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "同世代と語れる？",
    optionA: "最高に盛り上がれる",
    optionB: "一人で楽しむ派",
    countA: 17,
    countB: 17,
    commentCount: 5,
    tags: [SEED_TAG_CHAO],
    bookmarkCount: 4,
    createdAt: "2026-05-11T11:19:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "昔のバックナンバー、読み返す？",
    optionA: "定期的に読み返す",
    optionB: "当時の思い出のまま",
    countA: 20,
    countB: 22,
    commentCount: 6,
    tags: [SEED_TAG_CHAO],
    bookmarkCount: 5,
    createdAt: "2026-05-11T12:26:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  /* --- 最近見たアニメ --- */
  {
    patternType: "orange-purple",
    question: "見終わったら、次どうする？",
    optionA: "すぐ誰かに語りたい",
    optionB: "一人で余韻に浸る",
    countA: 23,
    countB: 27,
    commentCount: 7,
    tags: [SEED_TAG_RECENT_ANIME],
    bookmarkCount: 6,
    createdAt: "2026-05-12T13:33:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "映画1本 vs シリーズ、今の気分は？",
    optionA: "映画を攻めてる🎬",
    optionB: "シリーズ追いのワクワクが好き",
    countA: 26,
    countB: 12,
    commentCount: 3,
    tags: [SEED_TAG_RECENT_ANIME],
    bookmarkCount: 7,
    createdAt: "2026-05-12T14:40:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "評判より自分の直感？",
    optionA: "直感で選ぶ",
    optionB: "評判・口コミ重視",
    countA: 29,
    countB: 17,
    commentCount: 4,
    tags: [SEED_TAG_RECENT_ANIME],
    bookmarkCount: 8,
    createdAt: "2026-05-12T15:47:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "気に入った作品、どうする？",
    optionA: "同じ監督・スタジオも追う",
    optionB: "その1本だけで十分",
    countA: 14,
    countB: 22,
    commentCount: 5,
    tags: [SEED_TAG_RECENT_ANIME],
    bookmarkCount: 3,
    createdAt: "2026-05-12T16:54:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "SNSでネタバレされたら？",
    optionA: "めちゃ萎える",
    optionB: "知ってても楽しめる",
    countA: 17,
    countB: 27,
    commentCount: 6,
    tags: [SEED_TAG_RECENT_ANIME],
    bookmarkCount: 4,
    createdAt: "2026-05-12T17:01:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "見たアニメ、何度も見返す？",
    optionA: "何度も見返す🍿",
    optionB: "一回で十分、次へ進む",
    countA: 20,
    countB: 12,
    commentCount: 7,
    tags: [SEED_TAG_RECENT_ANIME],
    bookmarkCount: 5,
    createdAt: "2026-05-12T18:08:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  /* --- 懐かしいアニメ --- */
  {
    patternType: "yellow-loops",
    question: "子供の頃のアニメ、今見返す？",
    optionA: "見返して新しい発見がある",
    optionB: "記憶のままがいい",
    countA: 23,
    countB: 17,
    commentCount: 3,
    tags: [SEED_TAG_NOSTALGIC_ANIME],
    bookmarkCount: 6,
    createdAt: "2026-05-13T19:15:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "当時泣いた作品、今は？",
    optionA: "まだ泣ける",
    optionB: "大人になって別の感じ方をする",
    countA: 26,
    countB: 22,
    commentCount: 4,
    tags: [SEED_TAG_NOSTALGIC_ANIME],
    bookmarkCount: 7,
    createdAt: "2026-05-13T20:22:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "OP/ED、今も聴く？",
    optionA: "プレイリスト入りしてる",
    optionB: "当時だけの思い出",
    countA: 29,
    countB: 27,
    commentCount: 5,
    tags: [SEED_TAG_NOSTALGIC_ANIME],
    bookmarkCount: 8,
    createdAt: "2026-05-13T21:29:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "リメイク・新作化、嬉しい？",
    optionA: "ワクワクする",
    optionB: "昔のが一番で不安もある",
    countA: 14,
    countB: 12,
    commentCount: 6,
    tags: [SEED_TAG_NOSTALGIC_ANIME],
    bookmarkCount: 3,
    createdAt: "2026-05-13T10:36:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "テレビの再放送、見つけると？",
    optionA: "嬉しくて見ちゃう",
    optionB: "タイミング合わなければスルー",
    countA: 17,
    countB: 17,
    commentCount: 7,
    tags: [SEED_TAG_NOSTALGIC_ANIME],
    bookmarkCount: 4,
    createdAt: "2026-05-13T11:43:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "子どもに見せたい？",
    optionA: "積極的に見せたい",
    optionB: "自分だけの宝物にしたい",
    countA: 20,
    countB: 22,
    commentCount: 3,
    tags: [SEED_TAG_NOSTALGIC_ANIME],
    bookmarkCount: 5,
    createdAt: "2026-05-13T12:50:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  /* --- 実写化 --- */
  {
    patternType: "pink-blue",
    question: "実写化ニュース、最初の反応は？",
    optionA: "期待してる🎬",
    optionB: "不安の方が大きい",
    countA: 23,
    countB: 27,
    commentCount: 4,
    tags: [SEED_TAG_LIVE_ACTION],
    bookmarkCount: 6,
    createdAt: "2026-05-14T13:57:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "原作ファンとして、見る？",
    optionA: "見に行く・見る",
    optionB: "見ない・原作だけ",
    countA: 26,
    countB: 12,
    commentCount: 5,
    tags: [SEED_TAG_LIVE_ACTION],
    bookmarkCount: 7,
    createdAt: "2026-05-14T14:04:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "キャスティング、どこまで許容？",
    optionA: "イメージ近ければOK",
    optionB: "完全一致じゃないと無理",
    countA: 29,
    countB: 17,
    commentCount: 6,
    tags: [SEED_TAG_LIVE_ACTION],
    bookmarkCount: 8,
    createdAt: "2026-05-14T15:11:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "実写で「良かった」作品、ある？",
    optionA: "ある・推せる",
    optionB: "あまりない",
    countA: 14,
    countB: 22,
    commentCount: 7,
    tags: [SEED_TAG_LIVE_ACTION],
    bookmarkCount: 3,
    createdAt: "2026-05-14T16:18:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "アニメ版も実写も楽しめる？",
    optionA: "媒体ごとに楽しめる",
    optionB: "原作（漫画）が一番",
    countA: 17,
    countB: 27,
    commentCount: 3,
    tags: [SEED_TAG_LIVE_ACTION],
    bookmarkCount: 4,
    createdAt: "2026-05-14T17:25:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "実写の続編・シーズン2は？",
    optionA: "見る",
    optionB: "見ない",
    countA: 20,
    countB: 12,
    commentCount: 4,
    tags: [SEED_TAG_LIVE_ACTION],
    bookmarkCount: 5,
    createdAt: "2026-05-14T18:32:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
];

/** シードカードに安定 id を付与した一覧（モジュール内キャッシュ） */
const SEED_CARDS_WITH_ID: VoteCardData[] = voteCardsData.map((c, i) => ({
  ...c,
  id: `seed-${i}`,
}));

/** 作成VOTE + シードVOTE の結合一覧（seed 配列の再生成を避ける） */
export function buildAllVoteCards(createdVotesForTimeline: VoteCardData[]): VoteCardData[] {
  if (createdVotesForTimeline.length === 0) return SEED_CARDS_WITH_ID;
  return [...createdVotesForTimeline, ...SEED_CARDS_WITH_ID];
}

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
  return getSeedCardIdsByTag("ワンピース");
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
  "ワンピース",
  "鬼滅の刃",
  "葬送のフリーレン",
  "薬屋のひとりごと",
  "ダンダダン",
  "ちゃお",
  "最近見たアニメ",
  "懐かしいアニメ",
  "実写化",
];
