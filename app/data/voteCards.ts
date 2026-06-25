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
 * moyatto 想定：コミュニティ別の「もやっと」2択。
 * id は一覧側で seed-0 … seed-56 と付与（57件）。
 */
export const SEED_TAG_DOG_WALK = "犬の散歩もやっと";
export const SEED_TAG_SAD_PARENTING = "悲しい育児";
export const SEED_TAG_OTSUBONE = "オツボネ";

export const voteCardsData: VoteCardData[] = [
  /* --- 今日の献立 --- */
  {
    patternType: "yellow-loops",
    question: "平日の夕ごはん、今の気持ちに近いのはどっち？",
    optionA: "家で作ってなんとかする🍳",
    optionB: "外食・テイク・デリで解放🥡",
    countA: 21,
    countB: 18,
    commentCount: 5,
    tags: ["今日の献立"],
    bookmarkCount: 6,
    createdAt: "2026-05-08T07:20:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "献立を決めるとき、どっち派？",
    optionA: "週末にざっくり予定を立てる📋",
    optionB: "冷蔵庫を開けてその場で決める🧊",
    countA: 14,
    countB: 19,
    commentCount: 4,
    tags: ["今日の献立"],
    readMoreText: "「何作ろう」問題、毎日来るよね。",
    bookmarkCount: 4,
    createdAt: "2026-05-08T08:10:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "同じメニューが続いたとき、どうする？",
    optionA: "飽きる前に意識的に変える",
    optionB: "定番ルーティンで楽を優先する",
    countA: 17,
    countB: 16,
    commentCount: 3,
    tags: ["今日の献立"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T09:00:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  /* --- 仕事でもやった話 --- */
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
  /* --- ワーママのぼやき --- */
  {
    patternType: "pink-blue",
    question: "子どもが寝たあと、仕事のメールが来たら？",
    optionA: "今日は見ない、明日対応",
    optionB: "サッと返して気を楽にする",
    countA: 12,
    countB: 24,
    commentCount: 7,
    tags: ["ワーママ"],
    readMoreText: "境界線、毎日ちょっとずつ変わる。",
    bookmarkCount: 8,
    createdAt: "2026-05-08T06:30:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "保育園・学校の早退連絡、仕事どうする問題",
    optionA: "仕事を調整して向かう",
    optionB: "パートナー・家族に頼る",
    countA: 23,
    countB: 17,
    commentCount: 5,
    tags: ["ワーママ"],
    bookmarkCount: 6,
    createdAt: "2026-05-08T07:15:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "自分時間 vs 子ども優先、今週の自分は？",
    optionA: "自分の時間が足りない",
    optionB: "子ども優先で割り切れてる",
    countA: 15,
    countB: 18,
    commentCount: 3,
    tags: ["ワーママ"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T08:50:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  /* --- アニメ好き --- */
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
    question: "神回のシーン、見返す派？",
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
  /* --- ドラマの結末もやっと話 --- */
  {
    patternType: "blue-cyan",
    question: "最終回の予告、見る派？",
    optionA: "ネタバレ避けて見ない",
    optionB: "気になるからちゃんと見る",
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
    question: "ラストシーンに納得いかないとき、どうする？",
    optionA: "誰かと話してスッキリしたい",
    optionB: "一人で咀嚼して終わらせる",
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
    question: "ハッピーエンドじゃなかったドラマ、今の気持ちは？",
    optionA: "まだ引きずってる",
    optionB: "時間が経てば OK になった",
    countA: 19,
    countB: 17,
    commentCount: 6,
    tags: ["ドラマ"],
    readMoreText: "結末のモヤモヤ、人に言いたくなるタイプのやつ。",
    bookmarkCount: 6,
    createdAt: "2026-05-09T09:00:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  /* --- ゴルゴ31が好きな人 --- */
  {
    patternType: "orange-purple",
    question: "ゴルゴ31、映画と原作どっちが好き？",
    optionA: "映画のゴルゴ派🎬",
    optionB: "原作漫画のゴルゴ派📚",
    countA: 28,
    countB: 24,
    commentCount: 7,
    tags: ["ゴルゴ31"],
    readMoreText: "どっちも好きだけど、語り出すと長いやつ。",
    bookmarkCount: 9,
    createdAt: "2026-05-08T03:05:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "クールすぎる主人公、どう感じる？",
    optionA: "憧れる・カッコいい",
    optionB: "ちょっと疲れる・距離感ある",
    countA: 17,
    countB: 26,
    commentCount: 5,
    tags: ["ゴルゴ31"],
    bookmarkCount: 7,
    createdAt: "2026-05-08T06:02:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "リメイク・新作が出たら、あなたは？",
    optionA: "まず見に行く・チェックする",
    optionB: "名作は名作で守りたい、様子見",
    countA: 22,
    countB: 20,
    commentCount: 4,
    tags: ["ゴルゴ31"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T11:00:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  /* --- 追加シード（各コミュニティ +5） --- */
  {
    patternType: "geometric-stripes",
    question: "朝ごはん、食べる派？省略派？",
    optionA: "なんとか食べてから出る🍞",
    optionB: "コーヒーだけで乗り切る☕",
    countA: 18,
    countB: 14,
    commentCount: 2,
    tags: ["今日の献立"],
    bookmarkCount: 3,
    createdAt: "2026-05-10T07:00:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "冷凍食品、罪悪感ある？",
    optionA: "あるけど助かってる",
    optionB: "罪悪感ゼロ、最強の味方",
    countA: 11,
    countB: 22,
    commentCount: 4,
    tags: ["今日の献立"],
    bookmarkCount: 5,
    createdAt: "2026-05-10T08:15:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "料理、レシピ通り？アレンジ派？",
    optionA: "だいたいレシピ通り",
    optionB: "冷蔵庫の事情でアレンジしがち",
    countA: 15,
    countB: 19,
    commentCount: 3,
    tags: ["今日の献立"],
    bookmarkCount: 4,
    createdAt: "2026-05-10T09:30:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "お弁当、作る？買う？",
    optionA: "作る派（たまに崩れる）",
    optionB: "コンビニ・スーパーで買う",
    countA: 20,
    countB: 17,
    commentCount: 5,
    tags: ["今日の献立"],
    bookmarkCount: 6,
    createdAt: "2026-05-10T11:00:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "週末のまとめ作り、やってる？",
    optionA: "やって平日を楽にしたい",
    optionB: "その場その場派",
    countA: 13,
    countB: 16,
    commentCount: 2,
    tags: ["今日の献立"],
    readMoreText: "理想と現実のギャップ、あるある。",
    bookmarkCount: 3,
    createdAt: "2026-05-10T12:20:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "会議で言いたいこと、今の自分は？",
    optionA: "言えずに後でモヤる",
    optionB: "だいたい言えるようになってきた",
    countA: 21,
    countB: 12,
    commentCount: 6,
    tags: ["仕事"],
    bookmarkCount: 7,
    createdAt: "2026-05-10T07:30:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "上司との距離感、どっち寄り？",
    optionA: "適度な距離がいい",
    optionB: "もう少し話しやすくしたい",
    countA: 18,
    countB: 15,
    commentCount: 3,
    tags: ["仕事"],
    bookmarkCount: 4,
    createdAt: "2026-05-10T08:45:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "転職を考える夜、ある？",
    optionA: "たまにある",
    optionB: "今は考えてない",
    countA: 16,
    countB: 19,
    commentCount: 8,
    tags: ["仕事"],
    readMoreText: "寝る前に来るやつ。",
    bookmarkCount: 9,
    createdAt: "2026-05-10T10:00:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "仕事の飲み会、今の気分は？",
    optionA: "行きたい・顔合わせ大事",
    optionB: "正直しんどい、断りたい",
    countA: 14,
    countB: 23,
    commentCount: 4,
    tags: ["仕事"],
    bookmarkCount: 5,
    createdAt: "2026-05-10T11:30:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "休日に仕事のことを考えちゃう？",
    optionA: "考えちゃう、切り替え難しい",
    optionB: "オフはオフで切れてる",
    countA: 19,
    countB: 11,
    commentCount: 3,
    tags: ["仕事"],
    bookmarkCount: 4,
    createdAt: "2026-05-10T13:00:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "朝の支度、誰がリード？",
    optionA: "自分が仕切ってる",
    optionB: "パートナー・家族と分担",
    countA: 17,
    countB: 14,
    commentCount: 4,
    tags: ["ワーママ"],
    bookmarkCount: 5,
    createdAt: "2026-05-10T06:45:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "「ママやってる？」って聞かれたら？",
    optionA: "働いてることもちゃんと言う",
    optionB: "その場の空気で言い分ける",
    countA: 20,
    countB: 13,
    commentCount: 6,
    tags: ["ワーママ"],
    bookmarkCount: 6,
    createdAt: "2026-05-10T08:00:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "子どもの宿題、どこまで手伝う？",
    optionA: "最後まで見届けたい",
    optionB: "本人に任せて見守る",
    countA: 15,
    countB: 18,
    commentCount: 3,
    tags: ["ワーママ"],
    bookmarkCount: 4,
    createdAt: "2026-05-10T09:15:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "ワーママの自分、今どう感じてる？",
    optionA: "頑張ってる、でもしんどい",
    optionB: "バランス取れてきた気がする",
    countA: 22,
    countB: 10,
    commentCount: 7,
    tags: ["ワーママ"],
    readMoreText: "正解ないけど、言葉にしたくなる夜。",
    bookmarkCount: 8,
    createdAt: "2026-05-10T10:30:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "育休明けの職場復帰、今の気持ちは？",
    optionA: "まだ慣れない・モヤモヤある",
    optionB: "だいぶ落ち着いてきた",
    countA: 14,
    countB: 16,
    commentCount: 5,
    tags: ["ワーママ"],
    bookmarkCount: 5,
    createdAt: "2026-05-10T12:00:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "アニメの話、リアルタイムで誰かとしたい？",
    optionA: "毎週誰かと語りたい",
    optionB: "一人で楽しむのが好き",
    countA: 16,
    countB: 19,
    commentCount: 4,
    tags: ["アニメ"],
    bookmarkCount: 5,
    createdAt: "2026-05-10T14:00:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "サブスク、何個契約してる？気分は？",
    optionA: "多いけど割り切ってる",
    optionB: "絞りたい・整理したい",
    countA: 12,
    countB: 21,
    commentCount: 3,
    tags: ["アニメ"],
    bookmarkCount: 4,
    createdAt: "2026-05-10T15:10:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "推しキャラが負けた回、どうする？",
    optionA: "しばらく引きずる",
    optionB: "次の話で切り替える",
    countA: 18,
    countB: 14,
    commentCount: 2,
    tags: ["アニメ"],
    bookmarkCount: 3,
    createdAt: "2026-05-10T16:00:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "アニメの考察、見る派？",
    optionA: "ネットの考察も積極的に見る",
    optionB: "自分の解釈だけで楽しむ",
    countA: 15,
    countB: 17,
    commentCount: 5,
    tags: ["アニメ"],
    bookmarkCount: 6,
    createdAt: "2026-05-10T17:20:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "昔のアニメ、今も見返す？",
    optionA: "定期的に見返す",
    optionB: "当時の記憶のままがいい",
    countA: 20,
    countB: 13,
    commentCount: 4,
    tags: ["アニメ"],
    bookmarkCount: 5,
    createdAt: "2026-05-10T18:30:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "途中で離脱したドラマ、戻る？",
    optionA: "結末だけ調べる",
    optionB: "もう戻らない、割り切る",
    countA: 17,
    countB: 15,
    commentCount: 3,
    tags: ["ドラマ"],
    bookmarkCount: 4,
    createdAt: "2026-05-10T19:00:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "ドラマのキャラに感情移入しすぎる？",
    optionA: "しすぎて疲れることある",
    optionB: "適度に楽しめてる",
    countA: 19,
    countB: 14,
    commentCount: 5,
    tags: ["ドラマ"],
    bookmarkCount: 5,
    createdAt: "2026-05-10T20:10:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "考察ツイート、見る派？",
    optionA: "最終回後は積極的に見る",
    optionB: "ネタバレ避けて見ない",
    countA: 13,
    countB: 20,
    commentCount: 4,
    tags: ["ドラマ"],
    bookmarkCount: 4,
    createdAt: "2026-05-10T21:00:00.000Z",
    creator: { name: "たかし", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "続編が発表されたとき、あなたは？",
    optionA: "ワクワクが勝つ",
    optionB: "前作で十分、不安もある",
    countA: 16,
    countB: 18,
    commentCount: 6,
    tags: ["ドラマ"],
    readMoreText: "続編あるあるの期待と不安。",
    bookmarkCount: 6,
    createdAt: "2026-05-10T22:15:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "泣けるドラマ、連続で見れる？",
    optionA: "連続だと心が持たない",
    optionB: "泣きながらでも追える",
    countA: 14,
    countB: 17,
    commentCount: 2,
    tags: ["ドラマ"],
    bookmarkCount: 3,
    createdAt: "2026-05-10T23:00:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "ゴルゴ31、初めて知ったきっかけは？",
    optionA: "映画・TVで",
    optionB: "漫画・本で",
    countA: 19,
    countB: 16,
    commentCount: 4,
    tags: ["ゴルゴ31"],
    bookmarkCount: 5,
    createdAt: "2026-05-11T08:00:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "無口な主人公、他の作品でも好き？",
    optionA: "ゴルゴ以外でも好き",
    optionB: "ゴルゴ31だからこそ好き",
    countA: 15,
    countB: 18,
    commentCount: 3,
    tags: ["ゴルゴ31"],
    bookmarkCount: 4,
    createdAt: "2026-05-11T09:30:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "ゴルゴ31の話、誰かに勧めたい？",
    optionA: "勧めたいけど難しい",
    optionB: "同好会だけで語りたい",
    countA: 12,
    countB: 21,
    commentCount: 5,
    tags: ["ゴルゴ31"],
    bookmarkCount: 6,
    createdAt: "2026-05-11T11:00:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "アクションシーン、何回見る？",
    optionA: "何度もリピートする",
    optionB: "一度で十分",
    countA: 20,
    countB: 11,
    commentCount: 2,
    tags: ["ゴルゴ31"],
    bookmarkCount: 4,
    createdAt: "2026-05-11T12:30:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "ゴルゴ31グッズ、欲しい？",
    optionA: "欲しい・持ってる",
    optionB: "作品で十分、グッズは見るだけ",
    countA: 14,
    countB: 17,
    commentCount: 4,
    tags: ["ゴルゴ31"],
    readMoreText: "推し活する派としない派、どっちも正解。",
    bookmarkCount: 5,
    createdAt: "2026-05-11T14:00:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  /* --- 犬の散歩もやっと --- */
  {
    patternType: "yellow-loops",
    question: "散歩の「もやっと」、いちばんつらいのはどっち？",
    optionA: "家に帰りたがって逆方向に引っ張る🐕",
    optionB: "あれこれ嗅ぎすぎて全然進まない👃",
    countA: 22,
    countB: 19,
    commentCount: 6,
    tags: [SEED_TAG_DOG_WALK],
    bookmarkCount: 5,
    createdAt: "2026-06-01T08:00:00.000Z",
    creator: { name: "miki", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "yellow-loops",
    question: "犬が散歩を拒否し始めたら、あなたは？",
    optionA: "その日は引き返してあげる",
    optionB: "少しでも歩かせたい、粘る",
    countA: 17,
    countB: 24,
    commentCount: 4,
    tags: [SEED_TAG_DOG_WALK],
    readMoreText: "飼い主さんの体力も限界あるよね。",
    bookmarkCount: 4,
    createdAt: "2026-06-01T09:30:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "散歩中に他の犬とすれ違ったとき、近いのは？",
    optionA: "近づきたがる／吠えるのでハラハラする",
    optionB: "無視したいのに向こうから来るのがつらい",
    countA: 20,
    countB: 16,
    commentCount: 3,
    tags: [SEED_TAG_DOG_WALK],
    bookmarkCount: 3,
    createdAt: "2026-06-01T11:00:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  /* --- 悲しい育児 --- */
  {
    patternType: "pink-blue",
    question: "いちばん胸が締めつけられる育児の瞬間は？",
    optionA: "「ママ／パパじゃない方がいい」と言われたとき",
    optionB: "頑張っても「できない」と言われたとき",
    countA: 28,
    countB: 21,
    commentCount: 7,
    tags: [SEED_TAG_SAD_PARENTING],
    bookmarkCount: 6,
    createdAt: "2026-06-02T07:30:00.000Z",
    creator: { name: "mama", iconUrl: DEFAULT_MAMA_AVATAR_URL },
  },
  {
    patternType: "orange-purple",
    question: "子どもの成長、嬉しいけど悲しくなるのは？",
    optionA: "抱っこを求められなくなったとき",
    optionB: "わからない言葉ばかり言われなくなったとき",
    countA: 25,
    countB: 18,
    commentCount: 5,
    tags: [SEED_TAG_SAD_PARENTING],
    readMoreText: "成長の裏側にある切なさ、わかる人にはわかる。",
    bookmarkCount: 5,
    createdAt: "2026-06-02T09:00:00.000Z",
    creator: { name: "papa", iconUrl: DEFAULT_PAPA_AVATAR_URL },
  },
  {
    patternType: "geometric-stripes",
    question: "育児で一人になった夜、しんどいのはどっち？",
    optionA: "今日の失敗ばかり思い出す",
    optionB: "明日も同じことの繰り返しだと感じる",
    countA: 19,
    countB: 23,
    commentCount: 4,
    tags: [SEED_TAG_SAD_PARENTING],
    bookmarkCount: 4,
    createdAt: "2026-06-02T10:30:00.000Z",
    creator: { name: "あい", iconUrl: DEFAULT_AI_AVATAR_URL },
  },
  /* --- オツボネ --- */
  {
    patternType: "geometric-stripes",
    question: "オツボネがいる職場、いちばんイヤなのは？",
    optionA: "ミスしても上司に庇われる",
    optionB: "いい案件だけ渡される",
    countA: 31,
    countB: 27,
    commentCount: 8,
    tags: [SEED_TAG_OTSUBONE],
    bookmarkCount: 7,
    createdAt: "2026-06-03T08:00:00.000Z",
    creator: { name: "ryo", iconUrl: DEFAULT_RYO_AVATAR_URL },
  },
  {
    patternType: "blue-cyan",
    question: "自分がオツボネ扱いされたとき、つらいのは？",
    optionA: "雑用ばかり回ってくる",
    optionB: "他の人のフォローまで押し付けられる",
    countA: 24,
    countB: 29,
    commentCount: 5,
    tags: [SEED_TAG_OTSUBONE],
    bookmarkCount: 5,
    createdAt: "2026-06-03T09:45:00.000Z",
    creator: { name: "kouta", iconUrl: DEFAULT_KOUTA_AVATAR_URL },
  },
  {
    patternType: "pink-blue",
    question: "オツボネへの対応、あなたに近いのは？",
    optionA: "表面上は普通に付き合う",
    optionB: "距離を置いて関わりたくない",
    countA: 26,
    countB: 22,
    commentCount: 4,
    tags: [SEED_TAG_OTSUBONE],
    readMoreText: "職場の人間関係、ほんと疲れるよね。",
    bookmarkCount: 4,
    createdAt: "2026-06-03T11:15:00.000Z",
    creator: { name: "yui", iconUrl: DEFAULT_YUI_AVATAR_URL },
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
  "今日の献立",
  "仕事",
  "ワーママ",
  "アニメ",
  "ドラマ",
  "ゴルゴ31",
  "一気見",
  "モヤモヤ",
];
