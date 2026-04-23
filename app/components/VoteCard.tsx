"use client";

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { memo } from "react";
import Link from "next/link";
import { removeBookmarkFully } from "../data/bookmarkRemove";
import { showAppToast } from "../lib/appToast";
import VoteCardShareSheet from "./VoteCardShareSheet";
import VoteBeforeCommentModal from "./VoteBeforeCommentModal";
import { getVotePeriodStatusText, isVotingAllowedNow } from "../data/votePeriod";
import { getAvatarProxySrc } from "../lib/avatarProxy";
import { isRemoteHttpUrl, resolveAvatarSrc } from "../lib/normalize";

export type VoteCardPattern =
  | "geometric-stripes"
  | "pink-blue"
  | "blue-cyan"
  | "yellow-loops"
  | "orange-purple";

/** ログイン: SNSアイコン/名前、非ログイン: 共通アイコン */
export interface CurrentUser {
  type: "guest" | "sns";
  iconUrl?: string;
  name?: string;
}

export interface VoteCardCreator {
  name: string;
  iconUrl?: string;
}

export interface VoteCardProps {
  backgroundImageUrl?: string;
  patternType: VoteCardPattern;
  question: string;
  optionA: string;
  optionB: string;
  /** Aの回答数（取得データ） */
  countA?: number;
  /** Bの回答数（取得データ） */
  countB?: number;
  /** 2択回答数（countA+countB の代わりに指定可） */
  voteCount?: number;
  commentCount?: number;
  tags?: string[];
  /** オプションのテキスト（ない場合もある） */
  readMoreText?: string;
  bookmarked?: boolean;
  /** 2択を作成したユーザー */
  creator?: VoteCardCreator;
  /** 現在のユーザー（タップ時にアイコン表示。非ログインは共通アイコン） */
  currentUser?: CurrentUser;
  /** コメントページへのリンク用（指定時はコメントアイコンが /comments/[cardId] へ） */
  cardId?: string;
  /** コメント導線の遷移先を上書き（メンバー限定コレクション内コメント等） */
  commentsHref?: string;
  /** ブックマークトグル時（cardId と新しいフラグを渡す） */
  onBookmarkToggle?: (cardId: string, bookmarked: boolean) => void;
  /** 指定時はブックマークタップでこのコールバックのみ呼ぶ（コレクション選択モーダル用） */
  onBookmarkClick?: (cardId: string) => void;
  /** 親が管理する投票済み状態（検索画面の「投票済みを表示」用） */
  initialSelectedOption?: "A" | "B" | null;
  /** 投票時に親へ通知（cardId と A/B） */
  onVote?: (cardId: string, option: "A" | "B") => void;
  /** public: みんな見れる / private: リンクを知ってる人だけ（非公開バッジ表示） */
  visibility?: "public" | "private";
  /** 自分がコメント済みの場合 true（コメントアイコンを #FFE100 で表示） */
  hasCommented?: boolean;
  /** 3点リーダー（その他）タップ時（cardId を渡してモーダル表示用） */
  onMoreClick?: (cardId: string) => void;
  /** true のときコメント導線を出さず受け付けない旨を表示 */
  commentsDisabled?: boolean;
  /** Aの画像URL（指定時はフッター下にA/B画像を表示） */
  optionAImageUrl?: string;
  /** Bの画像URL */
  optionBImageUrl?: string;
  /** 投票期間開始日時（ISO）。終了とセットで指定 */
  periodStart?: string;
  /** 投票期間終了日時（ISO文字列）。設定時はタグ下に「投票終了までX日」または「投票期間終了」を表示 */
  periodEnd?: string;
}

const patternClasses: Record<VoteCardPattern, string> = {
  "geometric-stripes": "vote-pattern-geometric",
  "pink-blue": "vote-pattern-pink-blue",
  "blue-cyan": "vote-pattern-blue-cyan",
  "yellow-loops": "vote-pattern-yellow-loops",
  "orange-purple": "vote-pattern-orange-purple",
};

function VoteCard({
  backgroundImageUrl,
  patternType,
  question,
  optionA,
  optionB,
  countA: initialCountA = 0,
  countB: initialCountB = 0,
  voteCount,
  commentCount = 0,
  tags = [],
  readMoreText,
  bookmarked = false,
  creator,
  currentUser,
  cardId,
  commentsHref,
  onBookmarkToggle,
  onBookmarkClick,
  initialSelectedOption = null,
  onVote,
  visibility,
  hasCommented = false,
  onMoreClick,
  commentsDisabled = false,
  optionAImageUrl,
  optionBImageUrl,
  periodStart,
  periodEnd,
}: VoteCardProps) {
  const patternClass = patternClasses[patternType];
  const useImage = Boolean(backgroundImageUrl);

  const [selectedOption, setSelectedOption] = useState<"A" | "B" | null>(initialSelectedOption);
  const isSelectingRef = useRef(false);
  useEffect(() => {
    setSelectedOption(initialSelectedOption);
    // タップ直後に true のまま残ると、親の activity 同期で選択がリセットされたあと再投票できなくなる
    isSelectingRef.current = false;
  }, [initialSelectedOption, cardId]);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(bookmarked));
  useEffect(() => {
    setIsBookmarked(Boolean(bookmarked));
  }, [bookmarked]);
  const [localCountA, setLocalCountA] = useState(initialCountA);
  const [localCountB, setLocalCountB] = useState(initialCountB);
  const [displayPercentA, setDisplayPercentA] = useState(0);
  const [displayPercentB, setDisplayPercentB] = useState(0);
  const [readMoreExpanded, setReadMoreExpanded] = useState(false);
  const readMoreRef = useRef<HTMLParagraphElement | null>(null);
  const [readMoreOverflows, setReadMoreOverflows] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [voteBeforeCommentOpen, setVoteBeforeCommentOpen] = useState(false);

  const periodAllowsVote = useMemo(
    () => isVotingAllowedNow(periodStart, periodEnd),
    [periodStart, periodEnd]
  );
  const periodStatusText = useMemo(
    () => getVotePeriodStatusText(periodStart, periodEnd),
    [periodStart, periodEnd]
  );

  useEffect(() => {
    setLocalCountA(initialCountA);
    setLocalCountB(initialCountB);
  }, [initialCountA, initialCountB]);

  const total = localCountA + localCountB;
  const percentA = total > 0 ? Math.round((localCountA / total) * 100) : 0;
  const percentB = total > 0 ? Math.round((localCountB / total) * 100) : 0;
  const displayTotal = voteCount ?? total;

  useEffect(() => {
    if (selectedOption === null) return;
    setDisplayPercentA(0);
    setDisplayPercentB(0);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDisplayPercentA(percentA);
        setDisplayPercentB(percentB);
      });
    });
    return () => cancelAnimationFrame(t);
  }, [selectedOption, percentA, percentB]);

  // 「2行を超えるなら続きを読むを出す」をDOMの高さ差で判定（line-clamp適用時）
  useLayoutEffect(() => {
    if (!readMoreText) {
      setReadMoreOverflows(false);
      setReadMoreExpanded(false);
      return;
    }
    const el = readMoreRef.current;
    if (!el) return;

    let raf = 0;
    const measure = () => {
      // clamp あり（未展開）状態で overflow を確認
      if (!readMoreRef.current) return;
      const node = readMoreRef.current;
      const over = node.scrollHeight - node.clientHeight > 1;
      setReadMoreOverflows(over);
      if (!over) setReadMoreExpanded(false);
    };

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    // 初回と、レイアウト確定後にもう一度
    schedule();
    const t = window.setTimeout(schedule, 80);

    const onResize = () => schedule();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [readMoreText]);

  const handleSelectA = () => {
    if (!periodAllowsVote) return;
    if (isSelectingRef.current || selectedOption) return;
    isSelectingRef.current = true;
    setSelectedOption("A");
    setLocalCountA((c) => c + 1);
    if (cardId != null && onVote) onVote(cardId, "A");
  };
  const handleSelectB = () => {
    if (!periodAllowsVote) return;
    if (isSelectingRef.current || selectedOption) return;
    isSelectingRef.current = true;
    setSelectedOption("B");
    setLocalCountB((c) => c + 1);
    if (cardId != null && onVote) onVote(cardId, "B");
  };

  const showResult = selectedOption !== null;
  const handleNavigateToComments = () => {
    if (typeof window === "undefined") return;
    if (cardId == null) return;
    if (selectedOption == null) return;
    try {
      window.sessionStorage.setItem(`vote_last_selection_${cardId}`, selectedOption);
    } catch {
      // ignore
    }
  };

  return (
    <article className="relative w-full overflow-visible rounded-[18px] bg-white shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
      {visibility === "private" && (
        <span className="absolute right-5 top-5 z-10 rounded-full bg-gray-800/80 px-2.5 py-1 text-xs font-medium text-white">
          非公開
        </span>
      )}
      {/* 背景付きエリア（カード左右内側 20px） */}
      <div
        className={`relative min-h-[100px] rounded-t-[18px] bg-gray-200 bg-cover bg-center bg-no-repeat px-5 pb-[5.333vw] pt-[13.333vw] ${!useImage ? patternClass : ""}`}
        style={
          useImage
            ? { backgroundImage: `url(${backgroundImageUrl})` }
            : undefined
        }
      >
        {/* 黒ベタ：テキスト幅に可変・中央揃え */}
        <div className="flex justify-center">
          <div className="w-fit rounded-none bg-black px-4 pt-2 pb-2">
            <p className="vote-card-question-text whitespace-pre-line text-left text-white">
              {question}
            </p>
          </div>
        </div>

        {/* 選択肢（質問〜A 30px=8vw, A〜B の縦余白80%=3.2vw） */}
        <div className="mt-[8vw] flex flex-col gap-[3.2vw]">
          {!showResult ? (
            <>
              <button
                type="button"
                className={`vote-card-answer-shadow flex w-full overflow-hidden rounded-xl bg-white text-left ${
                  periodAllowsVote ? "transition-opacity active:opacity-90" : "cursor-not-allowed opacity-50"
                }`}
                onClick={handleSelectA}
                disabled={!periodAllowsVote}
              >
                <span className="flex w-[14.25%] min-w-[41px] shrink-0 items-center justify-center rounded-l-xl bg-[#E63E48] py-3.5 text-base font-bold text-white">
                  A
                </span>
                <span className="vote-card-option-text flex flex-1 items-center rounded-r-xl bg-white px-4 py-3.5 font-semibold text-[#212121]">
                  {optionA}
                </span>
              </button>
              <button
                type="button"
                className={`vote-card-answer-shadow flex w-full overflow-hidden rounded-xl bg-white text-left ${
                  periodAllowsVote ? "transition-opacity active:opacity-90" : "cursor-not-allowed opacity-50"
                }`}
                onClick={handleSelectB}
                disabled={!periodAllowsVote}
              >
                <span className="flex w-[14.25%] min-w-[41px] shrink-0 items-center justify-center rounded-l-xl bg-[#3273E3] py-3.5 text-base font-bold text-white">
                  B
                </span>
                <span className="vote-card-option-text flex flex-1 items-center rounded-r-xl bg-white px-4 py-3.5 font-semibold text-[#212121]">
                  {optionB}
                </span>
              </button>
            </>
          ) : (
            <>
              <div className="relative w-full overflow-visible">
                <div className="vote-card-answer-shadow flex overflow-visible rounded-xl bg-white">
                  <span className="flex w-[14.25%] min-w-[41px] shrink-0 items-center justify-center rounded-l-xl bg-[#E63E48] py-3.5 text-base font-bold text-white">
                    A
                  </span>
                  <div className="vote-card-option-text relative flex flex-1 min-w-0 items-start overflow-visible rounded-r-xl bg-white py-3.5 pl-4 pr-[20px]">
                    <div
                      className={`absolute inset-y-0 left-0 overflow-hidden bg-[#fce4ec] transition-[width] duration-300 ease-out ${displayPercentA >= 100 ? "rounded-r-xl" : ""}`}
                      style={{ width: `${displayPercentA}%` }}
                    />
                    <span className="relative z-10 min-w-0 whitespace-normal break-words font-semibold text-[#CF0606] leading-snug text-[clamp(12px,4.8vw,16px)]">
                      {optionA}
                    </span>
                    <span className="relative z-10 ml-auto flex min-w-[3rem] shrink-0 items-baseline justify-end">
                      <span className="vote-card-percent-number">{percentA}</span>
                      <span className="vote-card-percent-symbol">%</span>
                    </span>
                    {selectedOption === "A" && (
                      <span className="absolute -top-2 right-0 z-20 translate-x-1/2">
                        <UserAvatar user={currentUser} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative w-full overflow-visible">
                <div className="vote-card-answer-shadow flex overflow-visible rounded-xl bg-white">
                  <span className="flex w-[14.25%] min-w-[41px] shrink-0 items-center justify-center rounded-l-xl bg-[#3273E3] py-3.5 text-base font-bold text-white">
                    B
                  </span>
                  <div className="vote-card-option-text relative flex flex-1 min-w-0 items-start overflow-visible rounded-r-xl bg-white py-3.5 pl-4 pr-[20px]">
                    <div
                      className={`absolute inset-y-0 left-0 overflow-hidden bg-[#e3f2fd] transition-[width] duration-300 ease-out ${displayPercentB >= 100 ? "rounded-r-xl" : ""}`}
                      style={{ width: `${displayPercentB}%` }}
                    />
                    <span className="relative z-10 min-w-0 whitespace-normal break-words font-semibold text-[#1F77D4] leading-snug text-[clamp(12px,4.8vw,16px)]">
                      {optionB}
                    </span>
                    <span className="relative z-10 ml-auto flex min-w-[3rem] shrink-0 items-baseline justify-end">
                      <span className="vote-card-percent-number">{percentB}</span>
                      <span className="vote-card-percent-symbol">%</span>
                    </span>
                    {selectedOption === "B" && (
                      <span className="absolute -top-2 right-0 z-20 translate-x-1/2">
                        <UserAvatar user={currentUser} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* フッター（タグあり時は下0.36em、タグなし時は下2倍の0.72em） */}
      <div
        className={`flex items-center gap-4 border-t border-gray-100 px-5 pt-[2.73vw] ${tags.length > 0 ? "pb-[0.36em]" : "pb-[0.72em]"}`}
      >
        <span className="flex items-center gap-1" aria-label="2択回答数">
          <img src="/icons/votemark.svg" alt="" className="vote-card-footer-icon-square" />
          <span className="vote-card-footer-count">{displayTotal}</span>
        </span>
        {commentsDisabled ? (
          <span className="min-w-0 flex-1" aria-hidden />
        ) : cardId != null ? (
          selectedOption != null || hasCommented ? (
            <Link
              href={commentsHref ?? `/comments/${cardId}`}
              className="flex items-center gap-1 hover:opacity-80"
              aria-label={`コメント ${commentCount}件、コメントページへ`}
              onClick={handleNavigateToComments}
            >
              {hasCommented ? (
                <span className="comment-icon-commented vote-card-footer-icon-commented" aria-hidden />
              ) : (
                <img src="/icons/comment.svg" alt="" className="vote-card-footer-icon-square" />
              )}
              <span className="vote-card-footer-count">{commentCount}</span>
            </Link>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1 hover:opacity-80"
              aria-label={`コメント ${commentCount}件（投票後にコメントできます）`}
              onClick={() => setVoteBeforeCommentOpen(true)}
            >
              <img src="/icons/comment.svg" alt="" className="vote-card-footer-icon-square" />
              <span className="vote-card-footer-count">{commentCount}</span>
            </button>
          )
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
          className="flex items-center justify-center text-gray-400 hover:text-gray-600"
          aria-label={isBookmarked ? "ブックマークを外す" : "ブックマーク"}
          onClick={() => {
            if (cardId == null) return;
            if (onBookmarkClick) {
              onBookmarkClick(cardId);
              return;
            }
            if (isBookmarked) {
              removeBookmarkFully(cardId);
              setIsBookmarked(false);
              showAppToast("bookmarkを解除しました");
              return;
            }
            const next = !isBookmarked;
            setIsBookmarked(next);
            if (onBookmarkToggle) onBookmarkToggle(cardId, next);
          }}
        >
          {isBookmarked ? (
            <span className="bookmark-icon-bookmarked vote-card-footer-icon-bookmark" aria-hidden />
          ) : (
            <img
              src="/icons/bookmark.svg"
              alt=""
              className="vote-card-footer-icon-bookmark opacity-40"
            />
          )}
        </button>
        <div className="ml-auto flex items-center gap-1">
          {cardId != null && (
            <button
              type="button"
              className="flex items-center justify-center text-[var(--color-brand-logo)] hover:opacity-80"
              aria-label="シェア"
              onClick={(e) => {
                e.preventDefault();
                setShareSheetOpen(true);
              }}
            >
              <img src="/icons/icon_share.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={21} />
            </button>
          )}
          {cardId != null && onMoreClick && (
            <button
              type="button"
              className="flex items-center justify-center text-[var(--color-brand-logo)] hover:opacity-80"
              aria-label="その他"
              onClick={(e) => {
                e.preventDefault();
                onMoreClick(cardId);
              }}
            >
              <MoreIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* A/B画像（指定時のみ：フッター下・タグ上に2枚並び・角にA/Bバッジ） */}
      {(optionAImageUrl != null || optionBImageUrl != null) && (
        <div className="flex gap-2 px-5 pt-3">
          {optionAImageUrl != null && (
            <button
              type="button"
              className="relative aspect-square flex-1 overflow-hidden rounded-xl bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE100] disabled:cursor-not-allowed"
              onClick={handleSelectA}
              disabled={selectedOption !== null || !periodAllowsVote}
              aria-label="Aを投票"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={optionAImageUrl}
                alt={optionA}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <span
                className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#E63E48] text-sm font-bold text-white"
                aria-hidden
              >
                A
              </span>
            </button>
          )}
          {optionBImageUrl != null && (
            <button
              type="button"
              className="relative aspect-square flex-1 overflow-hidden rounded-xl bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE100] disabled:cursor-not-allowed"
              onClick={handleSelectB}
              disabled={selectedOption !== null || !periodAllowsVote}
              aria-label="Bを投票"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={optionBImageUrl}
                alt={optionB}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <span
                className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#3273E3] text-sm font-bold text-white"
                aria-hidden
              >
                B
              </span>
            </button>
          )}
        </div>
      )}

      {/* タグ（アイコン行〜タグ上 10px@375 を相対指定。タグブロックの下0.78em＝0.6em×1.3） */}
      {tags.length > 0 && (
        <div
          className={`vote-card-tags-margin-top flex flex-wrap gap-2 px-5 ${!readMoreText && !periodStatusText ? "pb-[0.78em]" : ""}`}
        >
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/search?tag=${encodeURIComponent(tag)}`}
              className="rounded-full text-[14px] text-blue-600 hover:underline"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* 投票期間（タグの下・薄いグレー15px。「追加したいコレクションを選択」と同じ色 #8A8A8A） */}
      {periodStatusText ? (
        <div
          className={`px-5 ${tags.length > 0 ? "pt-1" : "pt-2"} pb-[0.78em] text-[15px]`}
          style={{ color: "#8A8A8A" }}
        >
          {periodStatusText}
        </div>
      ) : null}

      {/* 続きを読む（テキスト下・続きを読む上下のマージンは15px） */}
      {readMoreText && (
        <div className="px-5 pt-[0.8em]">
          <p
            ref={readMoreRef}
            className={`text-[14px] text-gray-600 ${!readMoreExpanded ? "line-clamp-2" : ""}`}
          >
            {readMoreExpanded ? readMoreText : readMoreText}
          </p>
          {readMoreOverflows ? (
            <div className="mt-[15px] border-t border-[#E5E7EB] pt-[15px] pb-[15px] -mx-5">
              <div className="px-5 text-center">
                <button
                  type="button"
                  className="text-[14px] font-medium text-gray-600 hover:underline"
                  onClick={() => setReadMoreExpanded((e) => !e)}
                >
                  {readMoreExpanded ? "閉じる" : "続きを読む"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
      {/* タグなしの場合の下マージン */}
      {tags.length === 0 && <div className="pb-4" aria-hidden />}

      {shareSheetOpen && cardId != null && (
        <VoteCardShareSheet open={shareSheetOpen} onClose={() => setShareSheetOpen(false)} cardId={cardId} />
      )}
      <VoteBeforeCommentModal open={voteBeforeCommentOpen} onClose={() => setVoteBeforeCommentOpen(false)} />
    </article>
  );
}

export default memo(VoteCard);

/** 丸マスク・白縁・ドロップシャドウ。非ログインは共通アイコン、SNSログイン時は iconUrl を表示 */
const DEFAULT_AVATAR_URL = "/default-avatar.png";

function UserAvatar({ user }: { user?: CurrentUser | null }) {
  const isGuest = !user || user.type === "guest";
  const rawResolved = isGuest ? DEFAULT_AVATAR_URL : resolveAvatarSrc(user.iconUrl);
  const proxied = !isGuest && rawResolved !== DEFAULT_AVATAR_URL ? getAvatarProxySrc(rawResolved) : null;
  const src = isGuest ? DEFAULT_AVATAR_URL : (proxied ?? rawResolved);
  const useNoReferrer =
    !isGuest && proxied == null && rawResolved !== DEFAULT_AVATAR_URL && isRemoteHttpUrl(rawResolved);
  return (
    <span
      className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full border-4 border-white bg-gray-200 shadow-[0_0_4px_rgba(0,0,0,0.1)]"
      aria-hidden
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover object-top"
        loading="lazy"
        decoding="async"
        referrerPolicy={useNoReferrer ? "no-referrer" : undefined}
        onError={(e) => {
          e.currentTarget.onerror = null;
          if (proxied != null && e.currentTarget.src.includes("/api/avatar")) {
            e.currentTarget.src = rawResolved;
            if (isRemoteHttpUrl(rawResolved)) {
              e.currentTarget.referrerPolicy = "no-referrer";
            } else {
              e.currentTarget.removeAttribute("referrerpolicy");
            }
            return;
          }
          e.currentTarget.src = DEFAULT_AVATAR_URL;
          e.currentTarget.removeAttribute("referrerpolicy");
        }}
      />
    </span>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}
