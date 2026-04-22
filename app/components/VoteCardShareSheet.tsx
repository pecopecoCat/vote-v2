"use client";

import { useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { showAppToast } from "../lib/appToast";

export interface VoteCardShareSheetProps {
  open: boolean;
  onClose: () => void;
  cardId: string;
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function XLogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.904 10.468 20.48 3h-1.54l-5.71 6.346L8.93 3H3.2l6.874 9.823L3.2 21h1.54l6.032-6.7 4.82 6.7H21L13.904 10.468Zm-2.44 2.77-.697-.996L5.34 4.04h2.31l4.47 6.39.697.996 5.816 8.31h-2.31l-4.75-6.787Z" />
    </svg>
  );
}

export default function VoteCardShareSheet({ open, onClose, cardId }: VoteCardShareSheetProps) {
  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/comments/${encodeURIComponent(cardId)}`;
  }, [cardId]);

  const copyLink = useCallback(async () => {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      showAppToast("リンクをコピーしました");
      onClose();
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = pageUrl;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showAppToast("リンクをコピーしました");
        onClose();
      } catch {
        showAppToast("コピーできませんでした", "error");
      }
    }
  }, [pageUrl, onClose]);

  const shareToX = useCallback(() => {
    if (!pageUrl) return;
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent("VOTE")}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    onClose();
  }, [pageUrl, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  const node = (
    <>
      <div className="fixed inset-0 z-[75] bg-black/50" aria-hidden onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[80] max-h-[85vh] overflow-hidden rounded-t-[30px] bg-white pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vote-card-share-sheet-title"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-100 px-5 py-3">
          <div />
          <h2 id="vote-card-share-sheet-title" className="text-lg font-bold text-gray-900">
            シェア
          </h2>
          <div className="flex justify-end">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center text-[var(--color-select-b)] transition-opacity hover:opacity-80"
              aria-label="閉じる"
              onClick={onClose}
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
        <ul className="px-5 py-2">
          <li className="border-b border-gray-100">
            <button
              type="button"
              className="flex w-full items-center gap-3 py-4 text-left transition-colors hover:bg-gray-50"
              onClick={() => void copyLink()}
            >
              <LinkIcon className="shrink-0 text-gray-900" />
              <span className="card-options-modal-item-label text-sm font-bold text-gray-900">リンクをコピー</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-3 py-4 text-left transition-colors hover:bg-gray-50"
              onClick={shareToX}
            >
              <XLogoIcon className="shrink-0 text-gray-900" />
              <span className="card-options-modal-item-label text-sm font-bold text-gray-900">Xにシェア</span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );
  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
