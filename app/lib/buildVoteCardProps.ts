import type { VoteCardProps, CurrentUser } from "../components/VoteCard";
import type { VoteCardData } from "../data/voteCards";
import { getMergedCounts, type CardActivity } from "../data/voteCardActivity";

/**
 * VoteCard の表示・操作モード（ページごとの差分をここに集約）
 *
 * - participate: 未投票なら投票可（HOME / 検索 / コレクション / myVOTE / Bookmark 内一覧）
 * - votedHistory: 投票済みの確認用（プロフィール「投票」タブ）。再投票 UI は出さない
 */
export type VoteCardSurface = "participate" | "votedHistory";

export type BuildVoteCardPropsArgs = {
  card: VoteCardData;
  cardId: string;
  activity?: CardActivity | null;
  currentUser: CurrentUser;
  surface: VoteCardSurface;
  backgroundImageUrl: string;
  bookmarked?: boolean;
  hasCommented?: boolean;
  onVote?: (cardId: string, option: "A" | "B") => void;
  onBookmarkClick?: (cardId: string) => void;
  onMoreClick?: (cardId: string) => void;
  onAddToCollectionClick?: (cardId: string) => void;
  optimisticVoteResult?: boolean;
  hideShare?: boolean;
  hideBookmark?: boolean;
  commentsDisabled?: boolean;
  commentsHref?: string;
  /** コレクション画面など、画面固有の上書き */
  overrides?: Partial<VoteCardProps>;
};

function resolveInitialSelectedOption(act?: CardActivity | null): "A" | "B" | null {
  const o = act?.userSelectedOption;
  return o === "A" || o === "B" ? o : null;
}

/** 一覧用 VoteCard に渡す props を組み立て（票数マージ・投票済み状態を共通化） */
export function buildVoteCardProps(args: BuildVoteCardPropsArgs): VoteCardProps {
  const act = args.activity ?? { countA: 0, countB: 0, comments: [] };
  const merged = getMergedCounts(
    args.card.countA ?? 0,
    args.card.countB ?? 0,
    args.card.commentCount ?? 0,
    act
  );

  const base: VoteCardProps = {
    backgroundImageUrl: args.backgroundImageUrl,
    patternType: args.card.patternType ?? "yellow-loops",
    question: args.card.question,
    optionA: args.card.optionA,
    optionB: args.card.optionB,
    countA: merged.countA,
    countB: merged.countB,
    commentCount: merged.commentCount,
    tags: args.card.tags,
    readMoreText: args.card.readMoreText,
    creator: args.card.creator,
    currentUser: args.currentUser,
    cardId: args.cardId,
    visibility: args.card.visibility,
    optionAImageUrl: args.card.optionAImageUrl,
    optionBImageUrl: args.card.optionBImageUrl,
    periodStart: args.card.periodStart,
    periodEnd: args.card.periodEnd,
    commentsDisabled: args.commentsDisabled ?? args.card.commentsDisabled === true,
    bookmarked: args.bookmarked,
    hasCommented: args.hasCommented,
    initialSelectedOption: resolveInitialSelectedOption(act),
    commentsHref: args.commentsHref,
    hideShare: args.hideShare,
    hideBookmark: args.hideBookmark,
  };

  let props: VoteCardProps;
  if (args.surface === "votedHistory") {
    props = {
      ...base,
      onBookmarkClick: args.onBookmarkClick,
      onMoreClick: args.onMoreClick,
      onAddToCollectionClick: args.onAddToCollectionClick,
      optimisticVoteResult: true,
    };
  } else {
    props = {
      ...base,
      onVote: args.onVote,
      onBookmarkClick: args.onBookmarkClick,
      onMoreClick: args.onMoreClick,
      onAddToCollectionClick: args.onAddToCollectionClick,
      optimisticVoteResult: args.optimisticVoteResult ?? true,
    };
  }

  if (args.overrides) {
    props = { ...props, ...args.overrides };
  }
  return props;
}
