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

/**
 * アプリ初期表示・デモ用の固定VOTE（ローカル・KV有無どちらでもタイムラインに並ぶ）。
 * id は一覧側で seed-0 … と付与。
 */
export const voteCardsData: VoteCardData[] = [
  {
    patternType: "yellow-loops",
    question: "今週末、キャンプするなら山派？海派？",
    optionA: "気持ちいい高原キャンプ🏕️",
    optionB: "波と夕日の海キャンプ🏖️",
    countA: 18,
    countB: 14,
    commentCount: 5,
    tags: ["キャンプ", "アウトドア"],
    readMoreText: "電源・トイレ付きサイトと、ぶっつけ本色派、どちらもアリだけど論争が止まらない問いです。",
    bookmarkCount: 4,
    createdAt: "2026-05-02T09:00:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "pink-blue",
    question: "家のごはん、味はどっち寄りが好み？",
    optionA: "濃いめ・ごはんが進む系",
    optionB: "あっさり・素材の味わう系",
    countA: 31,
    countB: 27,
    commentCount: 8,
    tags: ["家の飯", "料理な2択"],
    bookmarkCount: 6,
    createdAt: "2026-05-04T11:30:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  {
    patternType: "blue-cyan",
    question: "韓国旅行でまず並ぶならどっちの列？",
    optionA: "サムギョプサルの名店🔥",
    optionB: "大人気チキン／トゥンカロンなどスイーツ🍗",
    countA: 22,
    countB: 19,
    commentCount: 4,
    tags: ["韓国グルメ", "グルメ"],
    readMoreText: "初日の腹の空き具合によって最適解が変わる伝説の2択。",
    bookmarkCount: 11,
    createdAt: "2026-05-05T07:15:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
  {
    patternType: "orange-purple",
    question: "BBQの主役ステーキは厚切りサーロイン vs ひれ、どちらが勝ち？",
    optionA: "ジューシー厚切りサーロイン🥩",
    optionB: "やわらかヒレ派的にいく👑",
    countA: 15,
    countB: 21,
    commentCount: 3,
    tags: ["BBQ", "グルメ"],
    bookmarkCount: 5,
    createdAt: "2026-05-06T08:00:00.000Z",
    creator: { name: "kouta", iconUrl: "/demo-user4.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "朝のお手入れ、乳液は「軽め」それとも「しっかり保湿」どっち気分？",
    optionA: "さっぱり・軽めテクスチャ",
    optionB: "しみこむまでしっかり保湿",
    countA: 12,
    countB: 16,
    commentCount: 2,
    tags: ["乳液"],
    bookmarkCount: 3,
    createdAt: "2026-05-06T21:45:00.000Z",
    creator: { name: "ryo", iconUrl: "/demo-user5.png" },
  },
  {
    patternType: "yellow-loops",
    question: "アウトドア飯、メイン調理ギアは？",
    optionA: "シングルバーナー細かく調理派",
    optionB: "焚き火／ダッチオーブン豪快派",
    countA: 9,
    countB: 13,
    commentCount: 1,
    tags: ["キャンプ", "アウトドア", "料理な2択"],
    bookmarkCount: 2,
    createdAt: "2026-05-07T06:20:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
  },
  {
    patternType: "pink-blue",
    question: "遠出のとき、朝は早起きガッツリ vs ゆっくり派？",
    optionA: "早く動いて長い一日を楽しむ",
    optionB: "朝はホテルの朝食ブッフェゆったり🍞",
    countA: 25,
    countB: 20,
    commentCount: 6,
    tags: ["グルメ"],
    bookmarkCount: 8,
    createdAt: "2026-05-07T14:10:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "blue-cyan",
    question: "夏の運動後の一杯、機能性ドリンク vs 水どっち優先？",
    optionA: "ちゃんと電解質補給したい☀️",
    optionB: "水だけでシンプルに",
    countA: 11,
    countB: 14,
    commentCount: 0,
    tags: ["アウトドア"],
    bookmarkCount: 1,
    createdAt: "2026-05-07T22:50:00.000Z",
    creator: { name: "kouta", iconUrl: "/demo-user4.png" },
  },
  /* --- アイドル / アニメ / 育児ネタ --- */
  {
    patternType: "orange-purple",
    question: "推しへの応援資金の使い方、どちら優先度高い？",
    optionA: "現場に行ける分はチケット・遠交通に回す📣",
    optionB: "グッズとトレカで推し愛を語る📸",
    countA: 28,
    countB: 24,
    commentCount: 7,
    tags: ["アイドル"],
    readMoreText: "貯金とも喧嘩しがち。この2択は永遠に結論が出ないタイプです。",
    bookmarkCount: 9,
    createdAt: "2026-05-08T03:05:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "初めてのアイドル現場ペンライトカラー選べない！どっち持つ？",
    optionA: "公式カラーだけ推し単色で統一★",
    optionB: "推し複数なら複数色ゆらぎレインボー派🌈",
    countA: 19,
    countB: 22,
    commentCount: 4,
    tags: ["アイドル"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T03:40:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
  },
  {
    patternType: "yellow-loops",
    question: "リリイベ・特典会並ぶならタイプはどっち？",
    optionA: "開場前から整列耐久・推しとの距離命🎤",
    optionB: "無理しない程度でゆる～く参加😌",
    countA: 14,
    countB: 17,
    commentCount: 3,
    tags: ["アイドル"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T05:15:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
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
    creator: { name: "ryo", iconUrl: "/demo-user5.png" },
  },
  {
    patternType: "blue-cyan",
    question: "推しコンテンツ、最新はどこでチェックしますか？",
    optionA: "公式・メディア速報だけ追う硬派派",
    optionB: "ファンタイムライン込み賑わい視聴パ🐦",
    countA: 17,
    countB: 26,
    commentCount: 5,
    tags: ["アイドル"],
    bookmarkCount: 7,
    createdAt: "2026-05-08T06:48:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  {
    patternType: "yellow-loops",
    question: "アニメ、まず新作は原作マンガ読んでから見る派？どっち？",
    optionA: "原作読んでネタバレ耐性つけてからアニメ",
    optionB: "ひとまず無知のまま映像だけ楽しむ派✨",
    countA: 23,
    countB: 19,
    commentCount: 6,
    tags: ["アニメ"],
    bookmarkCount: 8,
    createdAt: "2026-05-08T07:20:00.000Z",
    creator: { name: "kouta", iconUrl: "/demo-user4.png" },
  },
  {
    patternType: "pink-blue",
    question: "好きな作品の映画版、応援上映に行けるならどっち寄り？",
    optionA: "うちわ・コールOKのヒート上映🔥",
    optionB: "静かにスクリーン没入タイプ😶",
    countA: 11,
    countB: 15,
    commentCount: 2,
    tags: ["アニメ"],
    bookmarkCount: 3,
    createdAt: "2026-05-08T07:55:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "アニメ視聴、配信サービス複数あり派は？",
    optionA: "見たいがあるサブスクを全部チェック📺",
    optionB: "1つの定額だけに収めたい節約脳💴",
    countA: 18,
    countB: 14,
    commentCount: 1,
    tags: ["アニメ"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T08:30:00.000Z",
    creator: { name: "ryo", iconUrl: "/demo-user5.png" },
  },
  {
    patternType: "orange-purple",
    question: "週放送アニメ、溜めてから一気見 vs 放送日にしか見られないものは？",
    optionA: "最終回放送までギリ耐えられる我慢強い📅",
    optionB: "もう気になって全部イッキ見しちゃう🍿",
    countA: 15,
    countB: 27,
    commentCount: 4,
    tags: ["アニメ"],
    bookmarkCount: 6,
    createdAt: "2026-05-08T09:05:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
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
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "yellow-loops",
    question: "アニソン、通勤プレイリストにはカラオケ解禁曲とアレンジ版どちら増やしたい？",
    optionA: "TVサイズ・アニポジの王道でテンション上げ📱",
    optionB: "フル・アレンジ盤まで含め網羅したい📀",
    countA: 13,
    countB: 18,
    commentCount: 2,
    tags: ["アニメ", "アイドル"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T10:18:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  {
    patternType: "pink-blue",
    question: "子どもの離乳食、手作り中心 vs 工夫して市販頼み、今の自分はどっち？",
    optionA: "ミキサー愛用・できるだけ自分で😤",
    optionB: "オーガニック系の離乳食パウチもフル活用",
    countA: 24,
    countB: 21,
    commentCount: 8,
    tags: ["育児"],
    bookmarkCount: 7,
    createdAt: "2026-05-08T10:55:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "blue-cyan",
    question: "寝かしつけタイム、「抱っこゆらし派」それとも「布団離れさせたい自立派」？",
    optionA: "まずはゆらゆら唱えて平和を勝ち取る🌙",
    optionB: "早めに自分で寝る練習を積む派",
    countA: 16,
    countB: 19,
    commentCount: 6,
    tags: ["育児"],
    readMoreText: "月齢でも季節でも答え変わりますね…",
    bookmarkCount: 6,
    createdAt: "2026-05-08T11:30:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "公園日和、午前だけ活動 vs 午睡あけ夕方にもう一回外、どちら楽？",
    optionA: "午前ひと気合い外出して昼寝も早い⚡",
    optionB: "夕方また砂場でひと汗流す派🛝",
    countA: 12,
    countB: 14,
    commentCount: 2,
    tags: ["育児", "アウトドア"],
    bookmarkCount: 3,
    createdAt: "2026-05-08T12:06:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
  },
  {
    patternType: "orange-purple",
    question: "子どもの写真、SNS載せは？",
    optionA: "顔見せだけは避けスタンプ多め📷",
    optionB: "家族オンリー限定アカでときどきだけ",
    countA: 22,
    countB: 18,
    commentCount: 5,
    tags: ["育児"],
    bookmarkCount: 8,
    createdAt: "2026-05-08T12:42:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
  {
    patternType: "yellow-loops",
    question: "共働きの平日夜ごはん、「作りおき大作戦」それとも「当日さっさと簡単」？",
    optionA: "日曜まとめて作りおきコロッケ魂",
    optionB: "冷凍と惣菜＋ゆで卵でチャチャっと😋",
    countA: 19,
    countB: 24,
    commentCount: 4,
    tags: ["育児", "家の飯"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T13:18:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "pink-blue",
    question: "手作りおやつのママ父テンション、「焼き菓子焼けると嬉しい！」vs「なるべく電子レンジで」どっち？",
    optionA: "クッキー・マフィン生地こねるの楽しい👩‍🍳",
    optionB: "チンで蒸しパンプロジェクトで済ませ隊",
    countA: 15,
    countB: 13,
    commentCount: 1,
    tags: ["育児", "料理な2択"],
    bookmarkCount: 2,
    createdAt: "2026-05-08T13:55:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  {
    patternType: "blue-cyan",
    question: "子どもと過ごす雨の日、アニメ映画一本観よう vs プラレール大作戦どっち？",
    optionA: "ソファでお菓子持参シアター開始🎬",
    optionB: "床に線路敷きつめて工事現場になる🚃",
    countA: 17,
    countB: 16,
    commentCount: 3,
    tags: ["育児", "アニメ"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T14:31:00.000Z",
    creator: { name: "kouta", iconUrl: "/demo-user4.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "保育・幼稚園イベント、親のキャラどっちになりがち？",
    optionA: "手作り運動会的に全力で張り切る親🎌",
    optionB: "最低限準備だけサクッとして観覧に集中",
    countA: 14,
    countB: 20,
    commentCount: 2,
    tags: ["育児"],
    bookmarkCount: 3,
    createdAt: "2026-05-08T15:08:00.000Z",
    creator: { name: "ryo", iconUrl: "/demo-user5.png" },
  },
  {
    patternType: "orange-purple",
    question: "アイドルと育児、推しへの熱語るネタを子どもの前でも言うくらいオタ親？",
    optionA: "うちでは堂々応援グラデ語彙炸裂📣",
    optionB: "子どもの前はかわいく抽象化ワードのみ🍼",
    countA: 10,
    countB: 11,
    commentCount: 4,
    tags: ["アイドル", "育児"],
    readMoreText: "いずれ「ママ／パパの推し」を理解される未来が…？",
    bookmarkCount: 5,
    createdAt: "2026-05-08T15:45:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
  },
  /* --- パパ友あるある（末尾6個より前のみに追記すること） --- */
  {
    patternType: "pink-blue",
    question: "パパ友グループの連絡、いまどっち派が多い？",
    optionA: "Slack／Discord で仕事モード混入もOK👔",
    optionB: "LINEのまみれが落ち着く🐻",
    countA: 16,
    countB: 22,
    commentCount: 4,
    tags: ["育児", "パパ友"],
    readMoreText: "園イベントの細かい段取りだけはLINEに戻された…なんて声も。",
    bookmarkCount: 3,
    createdAt: "2026-05-08T18:05:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  {
    patternType: "blue-cyan",
    question: "休日の朝、パパ側でコーヒー飲んでる余裕ある？",
    optionA: "子より先起床できた勝利の日だけ☕️",
    optionB: "基本は家事ラッシュの合間に一息",
    countA: 11,
    countB: 28,
    commentCount: 5,
    tags: ["育児", "パパ友"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T18:21:00.000Z",
    creator: { name: "kouta", iconUrl: "/demo-user4.png" },
  },
  {
    patternType: "yellow-loops",
    question: "パパ友と飲み、話の大半はこの辺だった？",
    optionA: "仕事と趣味〜最近観てるコンテンツ",
    optionB: "子の最新ネタ／園のイベント／夫婦運営の現場🍻",
    countA: 19,
    countB: 25,
    commentCount: 3,
    tags: ["育児", "パパ友"],
    bookmarkCount: 5,
    createdAt: "2026-05-08T18:38:00.000Z",
    creator: { name: "ryo", iconUrl: "/demo-user5.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "運動会・発表会の公式動画係、どっちに寄った？",
    optionA: "長焦点で張り切りスタンディング親📹",
    optionB: "妻の構成案に無言追随のカメラ小僧",
    countA: 14,
    countB: 20,
    commentCount: 2,
    tags: ["育児", "パパ友"],
    bookmarkCount: 2,
    createdAt: "2026-05-08T18:52:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  {
    patternType: "orange-purple",
    question: "保育の連絡袋・名前付けセット、自分の達人度ルールは？",
    optionA: "曜日で洗濯→玄関セットをルーティ化",
    optionB: "週末にまとめてリネン山から救出🧺",
    countA: 17,
    countB: 18,
    commentCount: 1,
    tags: ["育児", "パパ友"],
    bookmarkCount: 3,
    createdAt: "2026-05-08T19:05:00.000Z",
    creator: { name: "kouta", iconUrl: "/demo-user4.png" },
  },
  {
    patternType: "pink-blue",
    question: "帰宅して「パパ今日何した？」質問への答え癖は？",
    optionA: "時間割くらい細かく共有する📋",
    optionB: "まずひとこと「仕事」で呼吸を整える😮‍💨",
    countA: 13,
    countB: 24,
    commentCount: 4,
    tags: ["育児", "パパ友"],
    readMoreText: "どちらも「ちゃんと話したい」の裏返しだったりします。",
    bookmarkCount: 4,
    createdAt: "2026-05-08T19:22:00.000Z",
    creator: { name: "ryo", iconUrl: "/demo-user5.png" },
  },
  /* --- 新社会人あるある --- */
  {
    patternType: "blue-cyan",
    question: "職場での呼び方、「○○さん」にするか先輩だけ苗字にするか、まだ迷いがち？",
    optionA: "気づいたら全員さん付けで統一してる",
    optionB: "部署ルールに合わせて毎日調整してる👔",
    countA: 19,
    countB: 14,
    commentCount: 2,
    tags: ["新社会人あるある"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T02:10:00.000Z",
    creator: { name: "ryo", iconUrl: "/demo-user5.png" },
  },
  {
    patternType: "yellow-loops",
    question: "休憩ルームで先輩と二人きりより、廊下ですれ違いだけのあいさつだけがしんどかったタイプは？",
    optionA: "二人きり無言タイムの方がキツい😶",
    optionB: "すれ違いのタイミング調整が地味に消耗する",
    countA: 13,
    countB: 21,
    commentCount: 3,
    tags: ["新社会人あるある"],
    bookmarkCount: 2,
    createdAt: "2026-05-09T02:28:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
  },
  {
    patternType: "pink-blue",
    question: "経費や交通費・申請、入社直後は「何度かやり直した」経験ある？",
    optionA: "まだたまに差し戻される…",
    optionB: "だいぶ手順は身体に染みた💮",
    countA: 22,
    countB: 11,
    commentCount: 4,
    tags: ["新社会人あるある"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T02:46:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "orange-purple",
    question: "チャットで「👍」だけで返すべきか文章にするか、ひと悶着したことある？",
    optionA: "絵文字だけだと冷たいか悩む日があった",
    optionB: "結局テキスト＋絵文字で様子見スタイルに落ち着いた",
    countA: 17,
    countB: 18,
    commentCount: 2,
    tags: ["新社会人あるある"],
    bookmarkCount: 4,
    createdAt: "2026-05-09T03:04:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "「お先に失礼します」のタイミング、周りの上司が動くまで待ちがちだった？",
    optionA: "まだ少し観察ムードが残る📎",
    optionB: "もう自分の区切りでジャスト帰宅できる",
    countA: 14,
    countB: 23,
    commentCount: 3,
    tags: ["新社会人あるある"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T03:22:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
  /* --- 恋愛2択 --- */
  {
    patternType: "pink-blue",
    question: "デートのあと、LINEの「どっちが先に送るか」って気にしたことある？",
    optionA: "あった（まだこっそり気にするかも）📱",
    optionB: "あまりなかった／もう気にしない",
    countA: 16,
    countB: 20,
    commentCount: 4,
    tags: ["恋愛"],
    bookmarkCount: 5,
    createdAt: "2026-05-09T04:00:00.000Z",
    creator: { name: "kouta", iconUrl: "/demo-user4.png" },
  },
  {
    patternType: "blue-cyan",
    question: "好きな気持ちを伝えるなら、どっちが自分に合いそう？",
    optionA: "言葉でちゃんと言う派💬",
    optionB: "プレゼントやデートの流れで伝える派🎁",
    countA: 18,
    countB: 19,
    commentCount: 3,
    tags: ["恋愛"],
    bookmarkCount: 4,
    createdAt: "2026-05-09T04:15:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
  {
    patternType: "yellow-loops",
    question: "喧嘩／すれ違いのあと、仲直りのタイプは？",
    optionA: "すぐ話して片付けたい派",
    optionB: "少し距離を置いて冷静になってから話す派🧊",
    countA: 14,
    countB: 25,
    commentCount: 5,
    tags: ["恋愛"],
    bookmarkCount: 6,
    createdAt: "2026-05-09T04:30:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "記念日、向こうだけ忘れてて一番こわいのはどっちだと思う？",
    optionA: "自分が忘れたパターン😱",
    optionB: "相手だけ忘れてるパターン☠️",
    countA: 12,
    countB: 22,
    commentCount: 2,
    tags: ["恋愛"],
    readMoreText: "「こわい」の定義は人それぞれ。笑いで納得する2択でもOK。",
    bookmarkCount: 4,
    createdAt: "2026-05-09T04:45:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  {
    patternType: "orange-purple",
    question: "愛情表現、もらうならどっちがすごく嬉しい？",
    optionA: "「好き」と言葉にしてもらうのが一番",
    optionB: "手料理・送迎・さりげない世話などの行動派が一番",
    countA: 21,
    countB: 17,
    commentCount: 4,
    tags: ["恋愛"],
    bookmarkCount: 5,
    createdAt: "2026-05-09T05:00:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
  },
  {
    patternType: "pink-blue",
    question: "LINEの連絡頻度で「自分の方が送ってない？」と気にしたことは？",
    optionA: "自分の方が多いかもって思ったことがある",
    optionB: "相手から来るまで待ちがちと自覚してる",
    countA: 15,
    countB: 18,
    commentCount: 3,
    tags: ["恋愛"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T05:15:00.000Z",
    creator: { name: "ryo", iconUrl: "/demo-user5.png" },
  },
  {
    patternType: "blue-cyan",
    question: "初めてのデート場所、「静かなカフェ」「にぎやかご飯屋」だったら自分は？」",
    optionA: "静かなカフェ・バーなど落ち着き重視☕️",
    optionB: "にぎやか〜普通のご飯屋で食べて話す派🍚",
    countA: 13,
    countB: 24,
    commentCount: 2,
    tags: ["恋愛"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T05:30:00.000Z",
    creator: { name: "kouta", iconUrl: "/demo-user4.png" },
  },
  {
    patternType: "yellow-loops",
    question: "恋のライバル（推しと呼ばれる人）っぽい存在が見えたら、自分はどっちに寄る？",
    optionA: "さりげなく聞けるなら確認したい派",
    optionB: "様子見で信じるしかないとのめり込み回避派",
    countA: 11,
    countB: 19,
    commentCount: 2,
    tags: ["恋愛"],
    bookmarkCount: 4,
    createdAt: "2026-05-09T05:45:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "同棲するなら家探し、「駅ちか・コンパクト」か「広め・郊外」を選ぶ気分は今どっち？",
    optionA: "駅近・サイズより通勤と眠りの質💤",
    optionB: "広さ・収納・ルームシェア料金との兼ね合い🏠",
    countA: 17,
    countB: 16,
    commentCount: 1,
    tags: ["恋愛"],
    bookmarkCount: 2,
    createdAt: "2026-05-09T06:00:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "orange-purple",
    question: "恋愛の『嫌な線引き』だけを選ぶとしたら、「浮気」の定義はどっちに寄る？（超ざっくり）",
    optionA: "浮気になりうる／ならないの壁は精神的な親密さ寄り💭",
    optionB: "身体かどうかがまずひとつの大きめの線🚧",
    countA: 18,
    countB: 15,
    commentCount: 5,
    tags: ["恋愛"],
    readMoreText: "価値観の話なので絶対正解ありません。**今の自分の感覚**でどうぞ。",
    bookmarkCount: 6,
    createdAt: "2026-05-09T06:15:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  /* --- グルメ2択 --- */
  {
    patternType: "yellow-loops",
    question: "ラーメン食べる気分、「とにかく濃くドロッ」と「あっさりスープで最後まで飲み干す」のどちらが近い？",
    optionA: "濃厚・家系寄りで攻めたい🍜",
    optionB: "あっさり・鶏×魚介などでスープ完飲気分",
    countA: 20,
    countB: 12,
    commentCount: 3,
    tags: ["グルメ"],
    bookmarkCount: 4,
    createdAt: "2026-05-09T07:05:00.000Z",
    creator: { name: "kouta", iconUrl: "/demo-user4.png" },
  },
  {
    patternType: "pink-blue",
    question: "焼肉ひと皿目、タン塩優先かカルビ優先か？（気分だけでOK）",
    optionA: "タン塩で口の中リセットしたい🔥",
    optionB: "カルビ油でテンション上げから入る",
    countA: 14,
    countB: 22,
    commentCount: 2,
    tags: ["グルメ"],
    bookmarkCount: 5,
    createdAt: "2026-05-09T07:20:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
  {
    patternType: "blue-cyan",
    question: "カレーライス、自分の原点に近いのはこのどっち？",
    optionA: "甘口・ケチャップ文化圏みたいな懐かしルー😋",
    optionB: "スパイス感じて鼻抜ける系が好き🌶️",
    countA: 16,
    countB: 18,
    commentCount: 4,
    tags: ["グルメ"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T07:35:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
  },
  {
    patternType: "orange-purple",
    question: "お寿司、同じ予算なら握り中心で攻める？巻物・一品も欲しい？",
    optionA: "握りのネタで勝負したい🍣",
    optionB: "巻き・椀物・デザートまで一周したい",
    countA: 19,
    countB: 14,
    commentCount: 2,
    tags: ["グルメ"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T07:50:00.000Z",
    creator: { name: "ryo", iconUrl: "/demo-user5.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "辛さ限界突破コース、自分はどっちに寄る？",
    optionA: "涙目でも完食して今日の自分を褒めたい🔥",
    optionB: "ムリはせず残す勇気も大事（胃が正義）",
    countA: 11,
    countB: 21,
    commentCount: 3,
    tags: ["グルメ"],
    bookmarkCount: 4,
    createdAt: "2026-05-09T08:05:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "yellow-loops",
    question: "お酒のつまみ、最初の一皿は枝豆？冷奴？",
    optionA: "枝豆の塩で口呼び醒まし🫛",
    optionB: "冷奴のタレと生姜で和む🧊",
    countA: 17,
    countB: 15,
    commentCount: 1,
    tags: ["グルメ"],
    bookmarkCount: 2,
    createdAt: "2026-05-09T08:20:00.000Z",
    creator: { name: "たかし", iconUrl: "/demo-user2.png" },
  },
  {
    patternType: "pink-blue",
    question: "朝パン買うなら、菓子パン路線？惣菜パン路線？",
    optionA: "クリーム・あんこで朝から幸福🥐",
    optionB: "チキン・コロッケでしょっぱい朝",
    countA: 13,
    countB: 19,
    commentCount: 2,
    tags: ["グルメ"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T08:35:00.000Z",
    creator: { name: "kouta", iconUrl: "/demo-user4.png" },
  },
  {
    patternType: "blue-cyan",
    question: "飲みの締め、ラーメンと牛丼どっち寄り？",
    optionA: "スープで〆る派（ラーメン・つけ麺など）",
    optionB: "米で〆る派（牛丼・親子丼など）🍚",
    countA: 22,
    countB: 13,
    commentCount: 4,
    tags: ["グルメ"],
    bookmarkCount: 5,
    createdAt: "2026-05-09T08:50:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
  {
    patternType: "orange-purple",
    question: "スイーツひとつだけなら、プリン？ショートケーキ？",
    optionA: "プリンのカラメル苦さと甘さのバランス🍮",
    optionB: "フルーツ乗ったショートで軽やかに🍰",
    countA: 18,
    countB: 16,
    commentCount: 3,
    tags: ["グルメ"],
    bookmarkCount: 4,
    createdAt: "2026-05-09T09:05:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "外食で予算オーバーしがちなのは、お酒？デザート？",
    optionA: "お酒の杯数とおつまみで盛り上がりすぎる🍺",
    optionB: "締めのスイーツ・ドリンクでトドメ刺し🍨",
    countA: 15,
    countB: 17,
    commentCount: 2,
    tags: ["グルメ"],
    bookmarkCount: 3,
    createdAt: "2026-05-09T09:20:00.000Z",
    creator: { name: "ryo", iconUrl: "/demo-user5.png" },
  },
  /* --- ママ目線・⚠️パパ閲覧注意コレ収録（必ず末尾6件＝voteCardsData の最後になるよう追加） --- */
  {
    patternType: "geometric-stripes",
    question: "夜間の対応、「起きてくれるだけありがたい」も手順ズレには内心モヤッたことある？",
    optionA: "あるけど伝えずに自分でリカバリーした💭",
    optionB: "その場で手順だけ共有することにした📣",
    countA: 21,
    countB: 14,
    commentCount: 5,
    tags: ["育児", "パパ閲覧注意"],
    readMoreText: "⚠️ ママ視点ツッコミ系。パパを責める話ではなく、夫婦の温度差ネタです。パパだけで見るときは覚悟を。",
    bookmarkCount: 6,
    createdAt: "2026-05-08T19:40:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "blue-cyan",
    question: "「休みの日は家事やってあげる」って言ってた〇〇の内容、チグハグだったことある？",
    optionA: "掃除のつもりがゲーム配信だった等のズレ😇",
    optionB: "気持ちはわかるので黙って差し替えた",
    countA: 18,
    countB: 16,
    commentCount: 3,
    tags: ["育児", "パパ閲覧注意"],
    bookmarkCount: 4,
    createdAt: "2026-05-08T19:52:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
  },
  {
    patternType: "yellow-loops",
    question: "妻の実家帰省でパパひとり子守りするとき、想像よりキツかったのは？",
    optionA: "献立〜買い出し〜片付けの無限ループ🍳",
    optionB: "寝る直前だけ倍速になるぐずりタイム😭",
    countA: 15,
    countB: 23,
    commentCount: 4,
    tags: ["育児", "パパ閲覧注意"],
    readMoreText: "⚠️ パパの頑張りは本当に尊いので、読んだらちゃんと「ありがとう」と言ってあげてくださいね。",
    bookmarkCount: 5,
    createdAt: "2026-05-08T20:05:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
  {
    patternType: "orange-purple",
    question: "ママ友グループだけの愚痴や本音、パパには見せたくないなと思ったことはある？",
    optionA: "ある（見せずに自分で処理してきた側）😶",
    optionB: "あまりない／うちのグループにはそんな話は出ない",
    countA: 12,
    countB: 19,
    commentCount: 2,
    tags: ["育児", "パパ閲覧注意"],
    readMoreText: "⚠️ ママ友同士では普通の愚痴でも、パパにそのまま見せると空気が読めなくなるタイプの話題、というニュアンスです。",
    bookmarkCount: 3,
    createdAt: "2026-05-08T20:18:00.000Z",
    creator: { name: "miki", iconUrl: "/demo-user1.png" },
  },
  {
    patternType: "pink-blue",
    question: "「パパにも育児は半分」理想と家の運用、どちら側に寄ってる体感？（ママ主観）",
    optionA: "分担できてる週もあればゆらぎもある⚖️",
    optionB: "まず声かけの起点が自分になりがちリスト📝",
    countA: 20,
    countB: 17,
    commentCount: 6,
    tags: ["育児", "パパ閲覧注意"],
    readMoreText: "⚠️ 数値勝負にしないジャンル。**あくまで自分の体感票** にしてくださいね。",
    bookmarkCount: 7,
    createdAt: "2026-05-08T20:32:00.000Z",
    creator: { name: "yui", iconUrl: "/demo-user6.png" },
  },
  {
    patternType: "geometric-stripes",
    question: "小児科・保健センターで「論争モード」の話題、パパの一言で静まってホッとしたことは？（逆にドキッとした？）",
    optionA: "静まってホッ✨",
    optionB: "まとめ役つかれたので帰り道ゆっくり歩いた🚶‍♀️",
    countA: 14,
    countB: 11,
    commentCount: 2,
    tags: ["育児", "パパ閲覧注意"],
    readMoreText: "⚠️ 医療の正解論争ではなく、**連れて行ってくれた人へのメンタル回復**ネタです。",
    bookmarkCount: 4,
    createdAt: "2026-05-08T20:48:00.000Z",
    creator: { name: "あい", iconUrl: "/demo-user3.png" },
  },
];

/** 「⚠️パパ閲覧注意」シードコレに含める件数（＝voteCardsData の末尾からこの件数だけ） */
export const SEED_PAPA_WARNING_CARD_COUNT = 6;

export function getSeedPapaWarningCardIds(): string[] {
  const n = SEED_PAPA_WARNING_CARD_COUNT;
  const len = voteCardsData.length;
  if (len < n) return [];
  return Array.from({ length: n }, (_, i) => `seed-${len - n + i}`);
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
  "キャンプ",
  "韓国グルメ",
  "家の飯",
  "グルメ",
  "BBQ",
  "アウトドア",
  "乳液",
  "料理な2択",
  "アイドル",
  "アニメ",
  "育児",
  "パパ友",
  "パパ閲覧注意",
  "新社会人あるある",
  "恋愛",
];
