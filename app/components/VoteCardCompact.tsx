"use client";

import type { VoteCardPattern } from "./VoteCard";

const patternClasses: Record<VoteCardPattern, string> = {
  "geometric-stripes": "vote-pattern-geometric",
  "pink-blue": "vote-pattern-pink-blue",
  "blue-cyan": "vote-pattern-blue-cyan",
  "yellow-loops": "vote-pattern-yellow-loops",
  "orange-purple": "vote-pattern-orange-purple",
};

export interface VoteCardCompactProps {
  backgroundImageUrl?: string;
  patternType: VoteCardPattern;
  question: string;
  optionA: string;
  optionB: string;
  countA: number;
  countB: number;
  commentCount: number;
  tags?: string[];
  voteCount?: number;
  bookmarked?: boolean;
  /** 選択した側に表示するユーザーアイコン（A or B）。未投票は undefined */
  selectedSide?: "A" | "B";
  userIconUrl?: string;
  /** 個別ページで投票可能にする場合のコールバック */
  onVote?: (side: "A" | "B") => void;
  /** true のときタグ行を非表示（個別ページ用） */
  hideTags?: boolean;
  /** mini: 個別ページ用（左右padding2倍・フッター下padding1.8倍） */
  variant?: "default" | "mini";
  /** 自分がコメント済みの場合 true（コメントアイコンを #FFE100 で表示） */
  hasCommented?: boolean;
  /** 3点リーダー（その他）タップ時（cardId を渡してモーダル表示用） */
  onMoreClick?: (cardId: string) => void;
  /** ブックマークタップ時（コレクション選択モーダル用。指定時はタップでこのコールバックのみ呼ぶ） */
  onBookmarkClick?: (cardId: string) => void;
  cardId?: string;
}

export default function VoteCardCompact({
  backgroundImageUrl,
  patternType,
  question,
  optionA,
  optionB,
  countA,
  countB,
  commentCount,
  tags = [],
  voteCount,
  bookmarked = false,
  selectedSide,
  userIconUrl = "/default-avatar.png",
  onVote,
  hideTags = false,
  variant = "default",
  hasCommented = false,
  onMoreClick,
  onBookmarkClick,
  cardId,
}: VoteCardCompactProps) {
  const useImage = Boolean(backgroundImageUrl);
  const patternClass = patternClasses[patternType];
  const total = countA + countB;
  const percentA = total > 0 ? Math.round((countA / total) * 100) : 0;
  const percentB = total > 0 ? Math.round((countB / total) * 100) : 0;
  const displayTotal = voteCount ?? total;
  const isMini = variant === "mini";

  return (
    <article className="w-full overflow-hidden rounded-[18px] bg-white shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
      <div
        className={`relative min-h-[72px] rounded-t-[18px] bg-gray-200 bg-cover bg-center bg-no-repeat pb-3 pt-5 ${isMini ? "px-[5.333vw]" : "pl-3 pr-10"} ${!useImage ? patternClass : ""}`}
        style={
          useImage ? { backgroundImage: `url(${backgroundImageUrl})` } : undefined
        }
      >
        <div className="flex justify-center">
          <div className="vote-card-compact-topic-box w-fit max-w-full rounded-none bg-black px-3 py-[9px]">
            <p className="vote-card-compact-question line-clamp-2 text-left text-white">
              {question}
            </p>
          </div>
        </div>

        <div className="mt-[18px] space-y-2">
          {isMini && selectedSide == null ? (
            <>
              <button
                type="button"
                className="flex w-full overflow-hidden rounded-lg bg-white text-left shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-opacity active:opacity-90"
                onClick={onVote ? () => onVote("A") : undefined}
              >
                <span className="flex w-[14.25%] min-w-[36px] shrink-0 items-center justify-center rounded-l-lg bg-[#E63E48] py-2 text-sm font-bold text-white">
                  A
                </span>
                <span className="vote-card-option-text flex flex-1 items-center rounded-r-lg bg-white px-3 py-2 text-sm font-semibold text-[#212121]">
                  {optionA}
                </span>
              </button>
              <button
                type="button"
                className="flex w-full overflow-hidden rounded-lg bg-white text-left shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-opacity active:opacity-90"
                onClick={onVote ? () => onVote("B") : undefined}
              >
                <span className="flex w-[14.25%] min-w-[36px] shrink-0 items-center justify-center rounded-l-lg bg-[#3273E3] py-2 text-sm font-bold text-white">
                  B
                </span>
                <span className="vote-card-option-text flex flex-1 items-center rounded-r-lg bg-white px-3 py-2 text-sm font-semibold text-[#212121]">
                  {optionB}
                </span>
              </button>
            </>
          ) : (
            <>
              <div
                className={`relative flex overflow-visible rounded-lg bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)] ${onVote ? "cursor-pointer active:opacity-90" : ""}`}
                onClick={onVote ? () => onVote("A") : undefined}
                role={onVote ? "button" : undefined}
              >
                <span className="flex w-[14.25%] min-w-[36px] shrink-0 items-center justify-center rounded-l-lg bg-[#E63E48] py-2 text-sm font-bold text-white">
                  A
                </span>
                <div
                  className={`vote-card-option-text relative flex flex-1 min-w-0 items-center overflow-visible rounded-r-lg bg-white py-2 pl-3 ${selectedSide === "A" ? "pr-14" : "pr-[4%]"}`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 overflow-hidden bg-[#fce4ec] ${percentA >= 100 ? "rounded-r-lg" : ""}`}
                    style={{ width: `${percentA}%` }}
                  />
                  <span className="relative z-10 truncate text-sm font-semibold text-[#CF0606]">
                    {optionA}
                  </span>
                  <span className={`relative z-10 ml-auto flex min-w-[2.5rem] shrink-0 items-baseline justify-end ${selectedSide === "A" ? "mr-5" : ""}`}>
                    <span className="vote-card-percent-number">{percentA}</span>
                    <span className="vote-card-percent-symbol">%</span>
                  </span>
                  {selectedSide === "A" && (
                    <span className="absolute -top-2 right-0 z-20 translate-x-1/2">
                      <span className="flex h-7 w-7 overflow-hidden rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.1)]">
                        <img src={userIconUrl} alt="" className="h-full w-full object-cover" />
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`relative flex overflow-visible rounded-lg bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)] ${onVote ? "cursor-pointer active:opacity-90" : ""}`}
                onClick={onVote ? () => onVote("B") : undefined}
                role={onVote ? "button" : undefined}
              >
                <span className="flex w-[14.25%] min-w-[36px] shrink-0 items-center justify-center rounded-l-lg bg-[#3273E3] py-2 text-sm font-bold text-white">
                  B
                </span>
                <div
                  className={`vote-card-option-text relative flex flex-1 min-w-0 items-center overflow-visible rounded-r-lg bg-white py-2 pl-3 ${selectedSide === "B" ? "pr-14" : "pr-[4%]"}`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 overflow-hidden bg-[#e3f2fd] ${percentB >= 100 ? "rounded-r-lg" : ""}`}
                    style={{ width: `${percentB}%` }}
                  />
                  <span className="relative z-10 truncate text-sm font-semibold text-[#1F77D4]">
                    {optionB}
                  </span>
                  <span className={`relative z-10 ml-auto flex min-w-[2.5rem] shrink-0 items-baseline justify-end ${selectedSide === "B" ? "mr-5" : ""}`}>
                    <span className="vote-card-percent-number">{percentB}</span>
                    <span className="vote-card-percent-symbol">%</span>
                  </span>
                  {selectedSide === "B" && (
                    <span className="absolute -top-2 right-0 z-20 translate-x-1/2">
                      <span className="flex h-7 w-7 overflow-hidden rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.1)]">
                        <img src={userIconUrl} alt="" className="h-full w-full object-cover" />
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className={`flex items-center gap-4 border-t border-gray-100 ${isMini ? "px-[5.333vw] pt-2 pb-[14.4px]" : "px-[5.333vw] py-2"}`}
      >
        <span className="flex items-center gap-1" aria-label="2択回答数">
          <img src="/icons/votemark.svg" alt="" className="h-4 w-4 scale-110" />
          <span className="vote-card-footer-count">{displayTotal}</span>
        </span>
        <span className="flex items-center gap-1" aria-label="コメント数">
          {hasCommented ? (
            <span className="comment-icon-commented h-4 w-4 scale-110" aria-hidden />
          ) : (
            <img src="/icons/comment.svg" alt="" className="h-4 w-4 scale-110" />
          )}
          <span className="vote-card-footer-count">{commentCount}</span>
        </span>
        <button
          type="button"
          className="flex items-center justify-center text-gray-400"
          aria-label="ブックマーク"
          onClick={() => cardId != null && onBookmarkClick?.(cardId)}
        >
          {bookmarked ? (
            <span className="bookmark-icon-bookmarked h-[18px] w-[15px]" aria-hidden />
          ) : (
            <img src="/icons/bookmark.svg" alt="" className="h-[18px] w-[15px] opacity-40" />
          )}
        </button>
        <button
          type="button"
          className="ml-auto flex items-center justify-center text-[var(--color-brand-logo)] hover:opacity-80"
          aria-label="その他"
          onClick={() => cardId != null && onMoreClick?.(cardId)}
        >
          <MoreIcon className="h-5 w-5" />
        </button>
      </div>

      {!hideTags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] text-blue-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}
