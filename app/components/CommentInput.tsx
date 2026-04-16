"use client";

import { useState, useRef, useEffect, type RefObject } from "react";
import Link from "next/link";

/** iOS Safari 等：fixed bottom がキーボードでずれるため、ビジュアルビューポートに合わせて bottom を補正 */
function useCommentBarVisualViewportOffset(
  barRef: RefObject<HTMLDivElement | null>,
  /** ログイン／入力の切り替えで DOM が差し替わるたびに再同期 */
  layoutKey?: boolean
) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const sync = () => {
      const el = barRef.current;
      if (!el) return;
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      el.style.bottom = `${Math.max(0, overlap)}px`;
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    sync();
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      const el = barRef.current;
      if (el) el.style.removeProperty("bottom");
    };
  }, [barRef, layoutKey]);
}

export interface CommentSubmitPayload {
  user: { name: string; iconUrl?: string };
  text: string;
}

interface CommentInputProps {
  /** コメント対象のカードID（指定時のみ送信が有効） */
  cardId?: string;
  /** 送信時に呼ばれる。登録されたコメント情報で保存する */
  onCommentSubmit?: (cardId: string, payload: CommentSubmitPayload) => void;
  /** 未投票時は入力・送信不可（プレースホルダーで無効表示） */
  disabled?: boolean;
  /** disabled 時のプレースホルダー（未指定時は「投票してコメントしよう!」） */
  disabledPlaceholder?: string;
  /** ログインユーザー（指定時はコメント送信時の表示名・アイコンに反映） */
  currentUser?: { name: string; iconUrl?: string };
  /** 未ログイン時に true の場合、入力欄の代わりに「ログインしてコメントしよう!」ボタンを表示 */
  showLoginButton?: boolean;
  /** ログインボタン押下後の戻り先（例: /comments/seed-0） */
  loginReturnTo?: string;
  /** 返信先のユーザー名（指定時はプレースホルダーを「○○へリプライ」に） */
  replyToUserName?: string;
  /** 返信モード解除（指定時は「返信先: ○○」と解除ボタンを表示） */
  onCancelReply?: () => void;
  /** 表示モード。bottomBar は画面下固定、inline は通常レイアウト内 */
  variant?: "bottomBar" | "inline";
}

export default function CommentInput({
  cardId,
  onCommentSubmit,
  disabled = false,
  disabledPlaceholder,
  currentUser,
  showLoginButton = false,
  loginReturnTo = "/profile",
  replyToUserName,
  onCancelReply,
  variant = "bottomBar",
}: CommentInputProps) {
  const [value, setValue] = useState("");
  const submittingRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useCommentBarVisualViewportOffset(barRef, variant === "bottomBar" ? showLoginButton : undefined);

  // 返信先を選んだら、すぐ入力できるようにフォーカス（モバイルの体感改善）
  useEffect(() => {
    if (disabled || showLoginButton) return;
    if (variant === "bottomBar" && !replyToUserName) return;
    // iOS Safari などで安定させるために、描画後へ回す
    const t = window.setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      // 既に入力済みでも末尾にカーソルを寄せる
      try {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      } catch {
        // setSelectionRange が使えない環境は無視
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [replyToUserName, disabled, showLoginButton, variant]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (disabled || submittingRef.current) return;
    const text = value.trim();
    if (!text || !cardId || !onCommentSubmit) return;
    submittingRef.current = true;
    onCommentSubmit(cardId, {
      user: currentUser ? { name: currentUser.name, iconUrl: currentUser.iconUrl } : { name: "自分", iconUrl: "/default-avatar.png" },
      text,
    });
    setValue("");
    submittingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (showLoginButton) {
    const href = loginReturnTo ? `/profile/login?returnTo=${encodeURIComponent(loginReturnTo)}` : "/profile/login";
    return (
      <div
        ref={barRef}
        className={
          variant === "bottomBar"
            ? "comment-input-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-[#F1F1F1] px-4 py-3"
            : "w-full px-4 py-3"
        }
      >
        {variant === "bottomBar" ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-full z-0 bg-[#F1F1F1] [height:max(12rem,min(85dvh,36rem))]"
          />
        ) : null}
        <div className="relative z-10 mx-auto max-w-lg">
          <Link
            href={href}
            className="block w-full rounded-xl bg-[#FFE100] py-3.5 text-center text-sm font-bold text-gray-900 hover:opacity-90"
          >
            ログインしてコメントしよう!
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={barRef}
      className={
        variant === "bottomBar"
          ? "comment-input-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-[#F1F1F1] px-4 pt-3"
          : "w-full px-4 pt-3"
      }
    >
      {variant === "bottomBar" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full z-0 bg-[#F1F1F1] [height:max(12rem,min(85dvh,36rem))]"
        />
      ) : null}
      <div className="relative z-10 mx-auto max-w-lg">
        {replyToUserName && onCancelReply && !disabled && (
          <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[12px] text-[#191919]">
            <span className="min-w-0 truncate opacity-80">返信先: {replyToUserName}</span>
            <button
              type="button"
              className="shrink-0 font-medium opacity-70 hover:opacity-100"
              onClick={onCancelReply}
            >
              解除
            </button>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex overflow-hidden rounded-[9999px]"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder={
              disabled
                ? (disabledPlaceholder ?? "投票してコメントしよう!")
                : replyToUserName
                  ? `${replyToUserName}へリプライ`
                  : "選んだ理由は？"
            }
            value={value}
            onChange={(e) => !disabled && setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={`min-w-0 flex-1 rounded-l-[9999px] border-y border-l border-r-0 px-4 py-3 text-sm focus:outline-none focus:ring-0 ${
              disabled
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 placeholder:text-gray-400"
                : "border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-[#FFE100]"
            }`}
            aria-label={disabled ? "投票後にコメントできます" : "コメント入力"}
          />
          <button
            type="submit"
            disabled={disabled}
            className={`shrink-0 rounded-r-[9999px] border border-l-0 border-gray-200 px-5 py-3 text-sm font-bold transition-opacity ${
              disabled
                ? "cursor-not-allowed bg-gray-200 text-gray-400"
                : "bg-[#FFE100] text-gray-900 active:opacity-90"
            }`}
          >
            送信
          </button>
        </form>
      </div>
    </div>
  );
}
