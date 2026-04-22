"use client";

import { useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { showAppToast } from "../lib/appToast";

export interface MemberCollectionShareSheetProps {
  open: boolean;
  onClose: () => void;
  collectionId: string;
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

export default function MemberCollectionShareSheet({ open, onClose, collectionId }: MemberCollectionShareSheetProps) {
  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/collection/${encodeURIComponent(collectionId)}`;
  }, [collectionId]);

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
        className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-2xl bg-white pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-share-sheet-title"
      >
        <div className="mx-auto flex max-w-lg items-center justify-end px-3 pb-2">
          <span id="member-share-sheet-title" className="sr-only">
            共有
          </span>
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
        <ul className="border-t border-gray-100">
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-medium text-[#191919] transition-colors hover:bg-gray-50 active:bg-gray-50"
              onClick={() => void copyLink()}
            >
              <LinkIcon className="shrink-0 text-[#191919]" />
              リンクをコピー
            </button>
          </li>
          <li className="border-t border-gray-100">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-medium text-[#191919] transition-colors hover:bg-gray-50 active:bg-gray-50"
              onClick={shareToX}
            >
              <XLogoIcon className="shrink-0 text-[#191919]" />
              Xにシェア
            </button>
          </li>
        </ul>
      </div>
    </>
  );
  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
