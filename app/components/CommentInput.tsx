"use client";

import { useState } from "react";

export interface CommentSubmitPayload {
  user: { name: string; iconUrl?: string };
  text: string;
}

interface CommentInputProps {
  /** コメント対象のカードID（指定時のみ送信が有効） */
  cardId?: string;
  /** 送信時に呼ばれる。登録されたコメント情報で保存する */
  onCommentSubmit?: (cardId: string, payload: CommentSubmitPayload) => void;
}

export default function CommentInput({ cardId, onCommentSubmit }: CommentInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const text = value.trim();
    if (!text || !cardId || !onCommentSubmit) return;
    onCommentSubmit(cardId, {
      user: { name: "自分", iconUrl: "/default-avatar.png" },
      text,
    });
    setValue("");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white px-4 pt-3 pb-3 safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <input
          type="text"
          placeholder="選んだ理由は？"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FFE100] focus:outline-none focus:ring-1 focus:ring-[#FFE100]"
          aria-label="コメント入力"
        />
        <button
          type="button"
          className="shrink-0 rounded-xl bg-[#FFE100] px-5 py-3 text-sm font-bold text-gray-900 transition-opacity active:opacity-90"
          onClick={handleSubmit}
        >
          送信
        </button>
      </div>
    </div>
  );
}
