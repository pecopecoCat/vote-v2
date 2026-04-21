"use client";

import { useEffect } from "react";

export interface VoteBeforeCommentModalProps {
  open: boolean;
  onClose: () => void;
}

/** 未投票でコメント導線を押したときの案内 */
export default function VoteBeforeCommentModal({ open, onClose }: VoteBeforeCommentModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div
        className="relative max-w-[min(100%,320px)] rounded-[18px] bg-white px-6 py-10 text-center shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vote-before-comment-msg"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="vote-before-comment-msg" className="text-sm font-medium leading-relaxed text-[#191919]">
          投票するとコメント・リプライすることができます
        </p>
      </div>
    </div>
  );
}
