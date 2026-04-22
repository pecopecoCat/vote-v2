/**
 * アクティビティ種別（該当するVOTEカードへのリンク用に cardId を持つ）
 */
export type ActivityType =
  | "created"              // 2択作成した
  | "voted"                // 投票した
  | "commented"            // コメントした
  | "voted_on_mine"        // あなたのトピックに投票された
  | "comment_on_mine"      // 〇〇があなたのトピックにコメントした
  | "reply_to_my_comment"  // 〇〇があなたのコメントにコメントした
  | "bookmark_on_mine"     // 作成した2択がブックマークされた
  | "period_ended"         // 投票結果が決定しました
  | "liked_my_comment"    // あなたのコメントにいいねされた
  | "member_joined_my_collection"; // 〇〇があなたのメンバー限定コレに参加した

export interface ActivityItem {
  type: ActivityType;
  /** リンク先のVOTEカードID（/comments/[cardId]） */
  cardId: string;
  /** 表示ラベル（actorName がある場合は「〇〇さんが…」で上書き表示） */
  label: string;
  date: string;
  /** ソート用の日時（ISO文字列）。最新順で使う */
  dateIso?: string;
  /** 2択のお題プレビュー（任意） */
  questionPreview?: string;
  /** アクションしたユーザー名（コメントした人等） */
  actorName?: string;
  /** アクションしたユーザーのアイコンURL */
  actorIconUrl?: string;
  /** コメント本文プレビュー（グレー枠に表示） */
  commentPreview?: string;
  /** アクションした人が選んだA or B（アイコン左上バッジ表示用） */
  actorVote?: "A" | "B";
  /** 指定時はこのURLへ遷移（コレクション参加通知など。未指定時は /comments/[cardId]） */
  linkHref?: string;
}

/** アクティビティ種別の表示ラベル（画像参考） */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  created: "2択を作成しました",
  voted: "投票しました",
  commented: "コメントしました",
  voted_on_mine: "あなたのトピックに投票されました",
  comment_on_mine: "作成した2択にコメントがありました", // 実際は actorName で「〇〇さんが、あなたのトピックにコメントしました」
  bookmark_on_mine: "作成した2択がブックマークされました",
  period_ended: "投票結果が決定しました！",
  liked_my_comment: "あなたのコメントにいいねされました",
  reply_to_my_comment: "あなたのコメントにコメントしました", // 実際は actorName で「〇〇さんが、あなたのコメントにコメントしました」
  member_joined_my_collection: "メンバー限定コレクションに参加されました",
};

/** デモ用：アクティビティ一覧（SNSログイン時表示用） */
export const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    type: "created",
    cardId: "seed-0",
    label: ACTIVITY_TYPE_LABELS.created,
    date: "2024.10.12",
    questionPreview: "好きな韓国料理は？",
  },
  {
    type: "voted",
    cardId: "seed-1",
    label: ACTIVITY_TYPE_LABELS.voted,
    date: "2024.10.12",
    questionPreview: "10円パンって10円だと思ってなかった？",
  },
  {
    type: "voted_on_mine",
    cardId: "seed-0",
    label: ACTIVITY_TYPE_LABELS.voted_on_mine,
    date: "2024.10.12",
    questionPreview: "好きな韓国料理は？",
  },
  {
    type: "comment_on_mine",
    cardId: "seed-0",
    label: ACTIVITY_TYPE_LABELS.comment_on_mine,
    date: "2024.10.12",
    questionPreview: "好きな韓国料理は？",
  },
  {
    type: "bookmark_on_mine",
    cardId: "seed-0",
    label: ACTIVITY_TYPE_LABELS.bookmark_on_mine,
    date: "2024.10.11",
    questionPreview: "好きな韓国料理は？",
  },
  {
    type: "liked_my_comment",
    cardId: "seed-1",
    label: ACTIVITY_TYPE_LABELS.liked_my_comment,
    date: "2024.10.11",
    questionPreview: "10円パンって10円だと思ってなかった？",
  },
  {
    type: "period_ended",
    cardId: "seed-3",
    label: ACTIVITY_TYPE_LABELS.period_ended,
    date: "2024.10.10",
    questionPreview: "物買う時どっち派？",
  },
  {
    type: "reply_to_my_comment",
    cardId: "seed-1",
    label: "johnさんが、あなたのコメントにコメントしました",
    date: "2024.10.12",
    questionPreview: "いいと思うよ! 離れて気づくこともある",
    actorName: "john",
    commentPreview: "いいと思うよ! 離れて気づくこともある",
  },
];

export interface AnnouncementItem {
  /** 既読判定用。未指定時は title + date でキー化 */
  id?: string;
  title: string;
  body: string;
  date: string;
}

export const MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    title: "VOTE のXキャンペーンのお知らせ",
    body: "VOTE のXキャンペーンのお知らせ 「サーティワン×コナンコラボキャンペーン」 開催!",
    date: "2024.10.12",
  },
  {
    title: "\\ VOTEが雑誌「○○○○」に掲載されました /",
    body: "VOTE企画「理想の彼氏をVOTEで調査!」を掲載していただきました。",
    date: "2024.10.12",
  },
  {
    title: "システム不具合のお詫び",
    body: "テキストがはいりますテキストがはいりますテキストがはいりますテキストがはいりますテキストがはいりますテキストがはいります",
    date: "2024.10.12",
  },
  {
    title: "新機能搭載!",
    body: "2択で相性がわかる 「2択でマッチング」 スタート✨",
    date: "2024.10.12",
  },
];
