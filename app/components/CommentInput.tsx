"use client";

import { useState, useRef } from "react";

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
}

export default function CommentInput({ cardId, onCommentSubmit, disabled = false, disabledPlaceholder, currentUser }: CommentInputProps) {
  const [value, setValue] = useState("");
  const submittingRef = useRef(false);

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

  return (
    <div className="comment-input-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white px-4 pt-3">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-lg overflow-hidden rounded-[9999px]"
      >
        <input
          type="text"
          placeholder={disabled ? (disabledPlaceholder ?? "投票してコメントしよう!") : "選んだ理由は？"}
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
  );
}
