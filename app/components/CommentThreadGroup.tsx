"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { VoteComment } from "../data/voteCardActivity";

/** 下端基準の拡大（矢印・丸みを相対的に大きく。ラッパーでクリップ） */
const THREAD_CONNECTOR_SCALE = 2.68;
/** コネクタをレール内で右へ（px）。クリップ幅に反映 */
const THREAD_CONNECTOR_OFFSET_X_PX = 6;
const THREAD_CONNECTOR_CLIP_W =
  Math.ceil(19 * THREAD_CONNECTOR_SCALE) + 4 + THREAD_CONNECTOR_OFFSET_X_PX;
const THREAD_RAIL_W_PX = Math.max(40, THREAD_CONNECTOR_CLIP_W);
/** スレッド線の下端＝最終リプライアバター上寄り（高さのこの割合の位置） */
const THREAD_LINE_END_ON_LAST_AVATAR = 0.28;

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

export function CommentAvatar({ comment }: { comment: VoteComment }) {
  const voteOpt = comment.userVoteOption;
  return (
    <div className="relative h-10 w-10 shrink-0">
      <span className="flex h-10 w-10 overflow-hidden rounded-full bg-[#E8E8E8]">
        <img src={comment.user.iconUrl ?? "/default-avatar.png"} alt="" className="h-full w-full object-cover" />
      </span>
      {voteOpt === "A" && (
        <span
          className="absolute -left-0.5 -top-0.5 flex h-[16.2px] w-[16.2px] items-center justify-center rounded-full bg-[var(--color-select-a)] text-[9px] font-bold leading-none text-white shadow-[0_0_0_2.5px_rgb(255,255,255)]"
          aria-hidden
        >
          A
        </span>
      )}
      {voteOpt === "B" && (
        <span
          className="absolute -left-0.5 -top-0.5 flex h-[16.2px] w-[16.2px] items-center justify-center rounded-full bg-[var(--color-select-b)] text-[9px] font-bold leading-none text-white shadow-[0_0_0_2.5px_rgb(255,255,255)]"
          aria-hidden
        >
          B
        </span>
      )}
    </div>
  );
}

export function CommentBody({
  comment,
  onLike,
  onReply,
  showReplyButton,
  replyDisabled,
  isLikedByMe,
  className = "",
  replyNavigateHref,
  replyCountOverride,
  navigateHref,
}: {
  comment: VoteComment;
  onLike?: () => void;
  onReply?: () => void;
  showReplyButton?: boolean;
  replyDisabled?: boolean;
  isLikedByMe?: boolean;
  className?: string;
  /** 指定時はリプライアイコンが画面遷移（ボタンの代わりに Link） */
  replyNavigateHref?: string;
  /** 指定時は返信数表示を上書き（保存値が古い場合の補正） */
  replyCountOverride?: number;
  /** 指定時は吹き出し全体タップで画面遷移 */
  navigateHref?: string;
}) {
  const router = useRouter();
  const replyCount = replyCountOverride ?? comment.replyCount ?? 0;
  const likeCount = comment.likeCount ?? 0;
  const navigable = Boolean(navigateHref);
  const handleNavigate = useCallback(() => {
    if (!navigateHref) return;
    router.push(navigateHref);
  }, [navigateHref, router]);
  return (
    <div
      className={`min-w-0 flex-1 ${className} ${navigable ? "cursor-pointer" : ""}`.trim()}
      onClick={navigable ? handleNavigate : undefined}
      role={navigable ? "link" : undefined}
      tabIndex={navigable ? 0 : undefined}
      onKeyDown={
        navigable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavigate();
              }
            }
          : undefined
      }
      aria-label={navigable ? "リプライ画面へ" : undefined}
    >
      <p className="text-[14px] font-bold text-[#191919]">{comment.user.name}</p>
      <p className="mt-[0.2625rem] text-[15px] font-normal leading-relaxed text-[#191919]">{comment.text}</p>
      <div className="mt-[0.525rem] flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-5 text-xs font-medium text-[#191919]">
          {showReplyButton &&
            (replyNavigateHref ? (
              <Link
                href={replyNavigateHref}
                className="flex items-center gap-1.5 opacity-90 hover:opacity-100"
                aria-label="リプライ画面へ"
                onClick={(e) => e.stopPropagation()}
              >
                <img src="/icons/comment.svg" alt="" className="h-[18px] w-[18px]" />
                {replyCount}
              </Link>
            ) : (
              <button
                type="button"
                className={`flex items-center gap-1.5 opacity-90 hover:opacity-100 ${
                  replyDisabled ? "cursor-not-allowed opacity-40 hover:opacity-40" : ""
                }`}
                disabled={replyDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (replyDisabled) return;
                  onReply?.();
                }}
              >
                <img src="/icons/comment.svg" alt="" className="h-[18px] w-[18px]" />
                {replyCount}
              </button>
            ))}
          {!showReplyButton && replyCount > 0 && (
            <span className="flex items-center gap-1.5">
              <img src="/icons/comment.svg" alt="" className="h-[18px] w-[18px]" />
              {replyCount}
            </span>
          )}
          <button
            type="button"
            className="flex items-center gap-1.5 opacity-90 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onLike?.();
            }}
            aria-label="いいね"
          >
            <img
              src="/icons/good.svg"
              alt=""
              className="h-[18px] w-[18px]"
              style={isLikedByMe ? { filter: "brightness(0) saturate(100%) invert(18%) sepia(98%) saturate(7000%) hue-rotate(348deg)" } : undefined}
            />
            <span className={isLikedByMe ? "text-[var(--color-select-a)]" : undefined}>{likeCount}</span>
          </button>
        </div>
        <button
          type="button"
          className="shrink-0 p-0.5 text-[#191919] hover:opacity-70"
          aria-label="その他"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export interface CommentThreadGroupProps {
  parent: VoteComment;
  replies: VoteComment[];
  likedCommentIds: string[];
  onParentLike: () => void;
  onParentReply: () => void;
  onReplyLike: (reply: VoteComment) => void;
  /** true のときリプライ操作を有効化。false のときリプライボタンを非活性（投票前など） */
  canReply?: boolean;
  /** リプライ行のコメントアイコン用（replyToReplyHref 未指定時） */
  onReplyReply?: (reply: VoteComment) => void;
  /** 指定時、親コメントの吹き出しタップでこのURLへ遷移 */
  parentReplyThreadHref?: string;
  /** 先頭からこの件数だけ表示。超える分は replyListMoreHref で案内 */
  maxRepliesVisible?: number;
  replyListMoreHref?: string;
  /** 指定時、各リプライのコメントアイコンはこのURLへ遷移 */
  replyToReplyHref?: string;
}

export default function CommentThreadGroup({
  parent,
  replies,
  likedCommentIds,
  onParentLike,
  onParentReply,
  onReplyLike,
  canReply = true,
  onReplyReply,
  parentReplyThreadHref,
  maxRepliesVisible,
  replyListMoreHref,
  replyToReplyHref,
}: CommentThreadGroupProps) {
  const parentReplyCount = replies.length;
  const visibleReplies = useMemo(
    () => (maxRepliesVisible != null ? replies.slice(0, maxRepliesVisible) : replies),
    [replies, maxRepliesVisible]
  );
  const showMoreReplies =
    maxRepliesVisible != null &&
    replies.length > 1 &&
    replies.length > maxRepliesVisible &&
    Boolean(replyListMoreHref);
  const showConnector = visibleReplies.length > 0;
  const threadFlexRef = useRef<HTMLDivElement>(null);
  const parentAvatarWrapRef = useRef<HTMLDivElement>(null);
  const lastReplyAvatarWrapRef = useRef<HTMLDivElement>(null);
  const [threadLineHeightPx, setThreadLineHeightPx] = useState<number | null>(null);

  const measureThreadLine = useCallback(() => {
    if (!showConnector) return;
    const pa = parentAvatarWrapRef.current;
    const la = lastReplyAvatarWrapRef.current;
    if (!pa || !la) return;
    const parentBottom = pa.getBoundingClientRect().bottom;
    const lastRect = la.getBoundingClientRect();
    const lineEndY = lastRect.top + lastRect.height * THREAD_LINE_END_ON_LAST_AVATAR;
    const h = lineEndY - parentBottom;
    setThreadLineHeightPx(Math.max(8, Math.round(h)));
  }, [showConnector]);

  useLayoutEffect(() => {
    measureThreadLine();
  }, [measureThreadLine, visibleReplies]);

  useEffect(() => {
    const root = threadFlexRef.current;
    if (!root || !showConnector) return;
    const ro = new ResizeObserver(() => measureThreadLine());
    ro.observe(root);
    window.addEventListener("resize", measureThreadLine);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureThreadLine);
    };
  }, [showConnector, measureThreadLine, visibleReplies.length]);

  return (
    <div className="w-full border-b border-[#DADADA]">
      <div
        ref={threadFlexRef}
        className={`flex items-stretch gap-3 px-[5.333vw] ${showConnector ? "pt-4 pb-4" : "py-4"}`}
      >
        <div
          className={`flex shrink-0 flex-col items-center ${showConnector ? "min-h-0" : "w-10"}`}
          style={showConnector ? { width: THREAD_RAIL_W_PX } : undefined}
        >
          <div ref={parentAvatarWrapRef}>
            <CommentAvatar comment={parent} />
          </div>
          {showConnector ? (
            <div
              className="relative mt-0 shrink-0 self-center overflow-hidden"
              style={{
                width: THREAD_CONNECTOR_CLIP_W,
                height: threadLineHeightPx ?? 8,
              }}
              aria-hidden
            >
              <img
                src="/icons/reply-thread-connector-long.svg"
                alt=""
                width={19}
                height={257}
                className="pointer-events-none absolute bottom-0 left-1/2 h-full w-[19px] object-fill object-bottom select-none"
                style={{
                  transform: `translateX(calc(-50% + ${THREAD_CONNECTOR_OFFSET_X_PX}px)) scale(${THREAD_CONNECTOR_SCALE})`,
                  transformOrigin: "50% 100%",
                }}
              />
            </div>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className={showConnector ? "pb-2" : ""}>
            <CommentBody
              comment={parent}
              onLike={onParentLike}
              onReply={onParentReply}
              showReplyButton
              replyDisabled={!canReply}
              isLikedByMe={likedCommentIds.includes(parent.id)}
              replyCountOverride={parentReplyCount}
              replyNavigateHref={parentReplyThreadHref}
              navigateHref={parentReplyThreadHref}
            />
          </div>
          {showConnector &&
            visibleReplies.map((r, i) => {
              const isLast = i === visibleReplies.length - 1;
              return (
                <div
                  key={r.id}
                  className={`flex gap-3 ${i === 0 ? "pt-2" : "pt-4"}`}
                >
                  <div ref={isLast ? lastReplyAvatarWrapRef : undefined}>
                    <CommentAvatar comment={r} />
                  </div>
                  <CommentBody
                    comment={r}
                    onLike={() => onReplyLike(r)}
                    onReply={replyToReplyHref ? undefined : () => onReplyReply?.(r)}
                    replyNavigateHref={replyToReplyHref}
                    navigateHref={replyToReplyHref}
                    showReplyButton
                    replyDisabled={!canReply && !replyToReplyHref}
                    isLikedByMe={likedCommentIds.includes(r.id)}
                  />
                </div>
              );
            })}
          {showMoreReplies && replyListMoreHref ? (
            <div className="mt-1 flex gap-3">
              <div className="h-10 w-10 shrink-0" aria-hidden />
              <Link
                href={replyListMoreHref}
                className="self-center text-[12px] font-normal leading-normal text-[#c3c3c3]"
              >
                もっと表示する
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
