"use client";

import { useState, useEffect, useMemo } from "react";
import type { VoteCardPattern } from "./VoteCard";
import VoteCardShareSheet from "./VoteCardShareSheet";
import { removeBookmarkFully } from "../data/bookmarkRemove";
import { showAppToast } from "../lib/appToast";
import { getVotePeriodStatusText, isVotingAllowedNow } from "../data/votePeriod";

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
  /** true のときコメント数の代わりに受け付けない旨を表示 */
  commentsDisabled?: boolean;
  /** ブックマークタップ時（コレクション選択モーダル用。指定時はタップでこのコールバックのみ呼ぶ） */
  onBookmarkClick?: (cardId: string) => void;
  cardId?: string;
  /** 投票期間開始日時（ISO） */
  periodStart?: string;
  /** 投票期間終了日時（ISO）。設定時はタグ下に期間ステータスを表示 */
  periodEnd?: string;
  /** みんなのコメントページ用 mini：質問20px・全文表示、A/B 折り返し、カード高さ可変 */
  expandMiniForCommentsPage?: boolean;
  /** 外枠カード内に埋め込むとき：本体のドロップシャドウを付けない（二重にならないように） */
  flatOuterShadow?: boolean;
  /** true のときフッターの投票数・コメント・ブックマーク・その他（アイコン行）を出さない */
  hideFooterIconRow?: boolean;
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
  commentsDisabled = false,
  onBookmarkClick,
  cardId,
  periodStart,
  periodEnd,
  expandMiniForCommentsPage = false,
  flatOuterShadow = false,
  hideFooterIconRow = false,
}: VoteCardCompactProps) {
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const periodAllowsVote = useMemo(
    () => isVotingAllowedNow(periodStart, periodEnd),
    [periodStart, periodEnd]
  );
  const periodStatusText = useMemo(
    () => getVotePeriodStatusText(periodStart, periodEnd),
    [periodStart, periodEnd]
  );

  const useImage = Boolean(backgroundImageUrl);
  const patternClass = patternClasses[patternType];
  const total = countA + countB;
  const percentA = total > 0 ? Math.round((countA / total) * 100) : 0;
  const percentB = total > 0 ? Math.round((countB / total) * 100) : 0;
  const displayTotal = voteCount ?? total;
  const isMini = variant === "mini";
  const expandMini = isMini && expandMiniForCommentsPage;

  return (
    <article
      className={`w-full overflow-hidden rounded-[18px] bg-white ${
        flatOuterShadow ? "" : "shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]"
      }`}
    >
      <div
        className={`relative rounded-t-[18px] bg-gray-200 bg-cover bg-center bg-no-repeat px-5 pb-3 pt-5 ${expandMini ? "min-h-0" : "min-h-[72px]"} ${!useImage ? patternClass : ""}`}
        style={
          useImage ? { backgroundImage: `url(${backgroundImageUrl})` } : undefined
        }
      >
        <div className="flex justify-center">
          <div
            className={`vote-card-compact-topic-box rounded-none bg-black ${expandMini ? "w-full max-w-full px-3 py-2.5 sm:px-4" : "w-fit max-w-full px-3 py-[9px]"}`}
          >
            <p
              className={`text-left font-bold text-white ${
                expandMini
                  ? "text-[20px] leading-snug break-words"
                  : "vote-card-compact-question line-clamp-2"
              }`}
              style={
                expandMini
                  ? { fontFamily: "var(--font-lato), var(--font-noto-sans-jp), sans-serif" }
                  : undefined
              }
            >
              {question}
            </p>
          </div>
        </div>

        <div className="mt-[18px] space-y-2">
          {isMini && selectedSide == null ? (
            <>
              <button
                type="button"
                className={`flex w-full overflow-hidden rounded-lg bg-white text-left shadow-[0_2px_6px_rgba(0,0,0,0.06)] ${expandMini ? "items-stretch" : "items-center"} ${
                  onVote && periodAllowsVote ? "transition-opacity active:opacity-90" : "cursor-not-allowed opacity-50"
                }`}
                onClick={onVote && periodAllowsVote ? () => onVote("A") : undefined}
                disabled={!onVote || !periodAllowsVote}
              >
                <span className="flex w-[14.25%] min-w-[36px] shrink-0 items-center justify-center self-stretch rounded-l-lg bg-[#E63E48] py-2 text-sm font-bold text-white">
                  A
                </span>
                <span
                  className={`vote-card-option-text flex flex-1 rounded-r-lg bg-white px-3 text-sm font-semibold text-[#212121] ${expandMini ? "items-center whitespace-normal break-words py-2.5 text-[15px] leading-snug" : "items-center py-2"}`}
                >
                  {optionA}
                </span>
              </button>
              <button
                type="button"
                className={`flex w-full overflow-hidden rounded-lg bg-white text-left shadow-[0_2px_6px_rgba(0,0,0,0.06)] ${expandMini ? "items-stretch" : "items-center"} ${
                  onVote && periodAllowsVote ? "transition-opacity active:opacity-90" : "cursor-not-allowed opacity-50"
                }`}
                onClick={onVote && periodAllowsVote ? () => onVote("B") : undefined}
                disabled={!onVote || !periodAllowsVote}
              >
                <span className="flex w-[14.25%] min-w-[36px] shrink-0 items-center justify-center self-stretch rounded-l-lg bg-[#3273E3] py-2 text-sm font-bold text-white">
                  B
                </span>
                <span
                  className={`vote-card-option-text flex flex-1 rounded-r-lg bg-white px-3 text-sm font-semibold text-[#212121] ${expandMini ? "items-center whitespace-normal break-words py-2.5 text-[15px] leading-snug" : "items-center py-2"}`}
                >
                  {optionB}
                </span>
              </button>
            </>
          ) : (
            <>
              <div
                className={`relative flex overflow-visible rounded-lg bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)] ${expandMini ? "items-stretch" : "items-center"} ${onVote && selectedSide == null && periodAllowsVote ? "cursor-pointer active:opacity-90" : ""} ${onVote && selectedSide == null && !periodAllowsVote ? "cursor-not-allowed opacity-50" : ""}`}
                onClick={onVote && selectedSide == null && periodAllowsVote ? () => onVote("A") : undefined}
                role={onVote && selectedSide == null && periodAllowsVote ? "button" : undefined}
              >
                <span className="flex w-[14.25%] min-w-[36px] shrink-0 items-center justify-center self-stretch rounded-l-lg bg-[#E63E48] py-2 text-sm font-bold text-white">
                  A
                </span>
                <div
                  className={`vote-card-option-text relative flex flex-1 min-w-0 gap-2 overflow-visible rounded-r-lg bg-white pl-3 ${expandMini ? `items-start py-2.5 ${selectedSide === "A" ? "pr-14" : "pr-[4%]"}` : `items-center py-2 ${selectedSide === "A" ? "pr-14" : "pr-[4%]"}`}`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 overflow-hidden bg-[#fce4ec] ${percentA >= 100 ? "rounded-r-lg" : ""}`}
                    style={{ width: `${percentA}%` }}
                  />
                  <span
                    className={`relative z-10 min-w-0 flex-1 font-semibold text-[#CF0606] ${expandMini ? "text-[15px] leading-snug break-words whitespace-normal" : "truncate text-sm"}`}
                  >
                    {optionA}
                  </span>
                  <span
                    className={`relative z-10 flex min-w-[2.5rem] shrink-0 items-baseline justify-end ${expandMini ? "self-start pt-0.5" : ""} ${selectedSide === "A" && !expandMini ? "mr-5" : ""}`}
                  >
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
                className={`relative flex overflow-visible rounded-lg bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)] ${expandMini ? "items-stretch" : "items-center"} ${onVote && selectedSide == null && periodAllowsVote ? "cursor-pointer active:opacity-90" : ""} ${onVote && selectedSide == null && !periodAllowsVote ? "cursor-not-allowed opacity-50" : ""}`}
                onClick={onVote && selectedSide == null && periodAllowsVote ? () => onVote("B") : undefined}
                role={onVote && selectedSide == null && periodAllowsVote ? "button" : undefined}
              >
                <span className="flex w-[14.25%] min-w-[36px] shrink-0 items-center justify-center self-stretch rounded-l-lg bg-[#3273E3] py-2 text-sm font-bold text-white">
                  B
                </span>
                <div
                  className={`vote-card-option-text relative flex flex-1 min-w-0 gap-2 overflow-visible rounded-r-lg bg-white pl-3 ${expandMini ? `items-start py-2.5 ${selectedSide === "B" ? "pr-14" : "pr-[4%]"}` : `items-center py-2 ${selectedSide === "B" ? "pr-14" : "pr-[4%]"}`}`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 overflow-hidden bg-[#e3f2fd] ${percentB >= 100 ? "rounded-r-lg" : ""}`}
                    style={{ width: `${percentB}%` }}
                  />
                  <span
                    className={`relative z-10 min-w-0 flex-1 font-semibold text-[#1F77D4] ${expandMini ? "text-[15px] leading-snug break-words whitespace-normal" : "truncate text-sm"}`}
                  >
                    {optionB}
                  </span>
                  <span
                    className={`relative z-10 flex min-w-[2.5rem] shrink-0 items-baseline justify-end ${expandMini ? "self-start pt-0.5" : ""} ${selectedSide === "B" && !expandMini ? "mr-5" : ""}`}
                  >
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

      {!hideFooterIconRow && (
        <div
          className={`flex items-center gap-4 border-t border-gray-100 px-5 ${isMini ? "pt-2 pb-[14.4px]" : "py-2"}`}
        >
          <span className="flex items-center gap-1" aria-label="2択回答数">
            <img src="/icons/votemark.svg" alt="" className="vote-card-footer-icon-square" />
            <span className="vote-card-footer-count">{displayTotal}</span>
          </span>
          {commentsDisabled ? (
            <span className="min-w-0 flex-1" aria-hidden />
          ) : (
            <span className="flex items-center gap-1" aria-label="コメント数">
              {hasCommented ? (
                <span className="comment-icon-commented vote-card-footer-icon-commented" aria-hidden />
              ) : (
                <img src="/icons/comment.svg" alt="" className="vote-card-footer-icon-square" />
              )}
              <span className="vote-card-footer-count">{commentCount}</span>
            </span>
          )}
          <button
            type="button"
            className="flex items-center justify-center text-gray-400"
            aria-label={bookmarked ? "ブックマークを外す" : "ブックマーク"}
            onClick={() => {
              if (cardId == null) return;
              if (bookmarked) {
                removeBookmarkFully(cardId);
                showAppToast("bookmarkを解除しました");
                return;
              }
              onBookmarkClick?.(cardId);
            }}
          >
            {bookmarked ? (
              <span className="bookmark-icon-bookmarked vote-card-footer-icon-bookmark" aria-hidden />
            ) : (
              <img src="/icons/bookmark.svg" alt="" className="vote-card-footer-icon-bookmark opacity-40" />
            )}
          </button>
          <div className="ml-auto flex items-center gap-1">
            {cardId != null && (
              <button
                type="button"
                className="flex items-center justify-center text-[var(--color-brand-logo)] hover:opacity-80"
                aria-label="シェア"
                onClick={() => setShareSheetOpen(true)}
              >
                <img src="/icons/icon_share.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={21} />
              </button>
            )}
            {cardId != null && onMoreClick && (
              <button
                type="button"
                className="flex items-center justify-center text-[var(--color-brand-logo)] hover:opacity-80"
                aria-label="その他"
                onClick={() => onMoreClick(cardId)}
              >
                <MoreIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {shareSheetOpen && cardId != null && (
        <VoteCardShareSheet open={shareSheetOpen} onClose={() => setShareSheetOpen(false)} cardId={cardId} />
      )}

      {!hideTags && tags.length > 0 && (
        <div className="vote-card-tags-margin-top flex flex-wrap gap-1.5 px-5 pb-2">
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

      {periodStatusText ? (
        <div
          className="px-5 pb-2 text-[15px]"
          style={{ color: "#8A8A8A" }}
        >
          {periodStatusText}
        </div>
      ) : null}
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
