"use client";

import { useEffect } from "react";
import CommentInput, { type CommentSubmitPayload } from "./CommentInput";

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
  onCancelReply,
}: CommentInputModalProps) {
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

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" aria-hidden onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-hidden rounded-t-[30px] bg-white shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label="コメント入力"
      >
        <div className="flex items-center justify-between px-5 pt-3">
          <div className="h-1.5 w-12 rounded-full bg-gray-200" aria-hidden />
          <button
            type="button"
            className="-mr-2 flex h-10 w-10 items-center justify-center"
            aria-label="閉じる"
            onClick={onClose}
          >
            <img src="/icons/icon_close.svg" alt="" className="icon-close-responsive" width={14} height={14} />
          </button>
        </div>
        <div className="pb-6 pt-2">
          <CommentInput
            variant="inline"
            cardId={cardId}
            onCommentSubmit={onCommentSubmit}
            disabled={disabled}
            disabledPlaceholder={disabledPlaceholder}
            currentUser={currentUser}
            showLoginButton={showLoginButton}
            loginReturnTo={loginReturnTo}
            replyToUserName={replyToUserName}
            onCancelReply={onCancelReply}
          />
        </div>
      </div>
    </>
  );
}

