/**
 * アクティビティ種別（該当するVOTEカードへのリンク用に cardId を持つ）
 */
export type ActivityType =
  | "created"              // 2択作成した
  | "voted"                // 投票した
  | "voted_on_mine"        // 作成した2択に投票された
  | "comment_on_mine"      // 作成した2択にコメントが来た
  | "comment_on_commented" // 自分がコメントした2択にコメントが来た
  | "period_ended";        // 投票期間が終わった

export interface ActivityItem {
  type: ActivityType;
  /** リンク先のVOTEカードID（/comments/[cardId]） */
  cardId: string;
  /** 表示ラベル */
  label: string;
  date: string;
  /** 2択のお題プレビュー（任意） */
  questionPreview?: string;
}

/** アクティビティ種別の表示ラベル */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  created: "2択を作成しました",
  voted: "投票しました",
  voted_on_mine: "作成した2択に投票されました",
  comment_on_mine: "作成した2択にコメントが届きました",
  comment_on_commented: "コメントした2択にコメントが届きました",
  period_ended: "投票期間が終了しました",
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
    type: "comment_on_commented",
    cardId: "seed-2",
    label: ACTIVITY_TYPE_LABELS.comment_on_commented,
    date: "2024.10.11",
    questionPreview: "未就学児の子育てママに質問 ☆ 1人時間を作ってますか??",
  },
  {
    type: "period_ended",
    cardId: "seed-3",
    label: ACTIVITY_TYPE_LABELS.period_ended,
    date: "2024.10.10",
    questionPreview: "物買う時どっち派？",
  },
];

export interface AnnouncementItem {
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
