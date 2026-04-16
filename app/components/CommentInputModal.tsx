"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CommentSubmitPayload } from "./CommentInput";

export interface CommentInputModalProps {
  open: boolean;
  onClose: () => void;
  cardId?: string;
  onCommentSubmit?: (cardId: string, payload: CommentSubmitPayload) => void;
  disabled?: boolean;
  disabledPlaceholder?: string;
  currentUser?: { name: string; iconUrl?: string };
  showLoginButton?: boolean;
  loginReturnTo?: string;
  replyToUserName?: string;
  replyToUserIconUrl?: string;
  onCancelReply?: () => void;
}

export default function CommentInputModal({
  open,
  onClose,
  cardId,
  onCommentSubmit,
  disabled,
  disabledPlaceholder,
  currentUser,
  showLoginButton,
  loginReturnTo,
  replyToUserName,
  replyToUserIconUrl,
  onCancelReply,
}: CommentInputModalProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setIsInputFocused(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
        setKeyboardInsetPx(inset);
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
      setKeyboardInsetPx(0);
    };
  }, [open]);

  if (!open) return null;

  const effectiveDisabled = Boolean(disabled) || !cardId || !onCommentSubmit;
  const trimmed = value.trim();
  const canSubmit = !effectiveDisabled && trimmed.length > 0;

  const focusInput = () => {
    if (effectiveDisabled) return;
    inputRef.current?.focus();
    setIsInputFocused(true);
  };

  const handleSubmit = () => {
    if (!canSubmit || !cardId || !onCommentSubmit) return;
    const payload: CommentSubmitPayload = {
      user: currentUser
        ? { name: currentUser.name, iconUrl: currentUser.iconUrl }
        : { name: "自分", iconUrl: "/default-avatar.png" },
      text: trimmed,
    };
    onCommentSubmit(cardId, payload);
    setValue("");
    onClose();
  };

  const modalTitle = replyToUserName ? "リプライを入力" : "コメントを入力";
  const hintText = replyToUserName ? "返信してみよう" : "コメントを入力しよう";

  if (showLoginButton) {
    const href = loginReturnTo ? `/profile/login?returnTo=${encodeURIComponent(loginReturnTo)}` : "/profile/login";
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-black/50" aria-hidden onClick={onClose} />
        <div
          className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-hidden rounded-t-[30px] bg-white shadow-lg"
          style={{ bottom: keyboardInsetPx, transition: "bottom 160ms ease-out" }}
          role="dialog"
          aria-modal="true"
          aria-label={modalTitle}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-100 px-5 py-3">
            <div />
            <span className="text-lg font-bold text-gray-900">{modalTitle}</span>
            <div className="flex justify-end">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center"
                aria-label="閉じる"
                onClick={onClose}
              >
                <img src="/icons/icon_close.svg" alt="" className="icon-close-responsive" width={14} height={14} />
              </button>
            </div>
          </div>
          <div className="bg-[#F1F1F1] px-5 pb-6 pt-4">
            <Link
              href={href}
              className="block w-full rounded-xl bg-[#FFE100] py-3.5 text-center text-sm font-bold text-gray-900 hover:opacity-90"
            >
              ログインしてコメントしよう!
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" aria-hidden onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-hidden rounded-t-[30px] bg-white shadow-lg"
        style={{ bottom: keyboardInsetPx, transition: "bottom 160ms ease-out" }}
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
      >
        {/* handle */}
        <div className="px-5 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200" aria-hidden />
        </div>

        {/* header */}
        <div className="relative flex items-center justify-center border-b border-[#DADADA] px-5 py-4">
          <span className="text-lg font-bold text-[#191919]">{modalTitle}</span>
          <button
            type="button"
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center"
            aria-label="閉じる"
            onClick={onClose}
          >
            <span className="text-[26px] font-light leading-none text-[#0779F1]" aria-hidden>
              ×
            </span>
          </button>
        </div>

        {/* body (tap-to-focus, input not visible) */}
        <button
          type="button"
          className={`block w-full flex-1 px-5 py-6 text-left rounded-2xl transition-colors ${
            isInputFocused ? "bg-white/80 ring-2 ring-[#FFE100] ring-offset-2 ring-offset-[#F1F1F1]" : ""
          }`}
          onClick={focusInput}
          disabled={effectiveDisabled}
        >
          {replyToUserName ? (
            <div className="mb-3 flex items-center justify-between gap-3 text-[12px] text-[#191919]">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 overflow-hidden rounded-full bg-[#E8E8E8]">
                  <img src={replyToUserIconUrl ?? "/default-avatar.png"} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="min-w-0 truncate font-semibold">{replyToUserName}</span>
                <span className="shrink-0 text-[#191919]/35">さんに返信</span>
              </div>
              {onCancelReply ? (
                <button
                  type="button"
                  className="shrink-0 font-medium opacity-70 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelReply();
                  }}
                >
                  解除
                </button>
              ) : null}
            </div>
          ) : null}

          {trimmed.length === 0 ? (
            <p className="text-sm font-medium text-[#191919]/35">
              {disabled ? (disabledPlaceholder ?? hintText) : hintText}
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm font-medium text-[#191919]">{value}</p>
          )}
        </button>

        {/* actual input (hidden) */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setIsInputFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          aria-hidden
          tabIndex={-1}
        />

        {/* footer: send button only */}
        <div className="border-t border-[#DADADA] bg-white px-5 py-5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full rounded-xl py-4 text-center text-sm font-bold ${
              canSubmit
                ? "bg-[#FFE100] text-[#191919] active:opacity-90"
                : "cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF]"
            }`}
          >
            送信
          </button>
        </div>
      </div>
    </>
  );
}

