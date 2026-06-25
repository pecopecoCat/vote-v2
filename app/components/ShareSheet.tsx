"use client";

import { useCallback, useMemo } from "react";
import { showAppToast } from "../lib/appToast";
import BottomSheet from "./BottomSheet";
import { ModalCloseRightHeader, ModalTitleHeader } from "./modal";
import { Z_INDEX } from "../lib/zIndex";

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

type ShareSheetProps = {
  open: boolean;
  onClose: () => void;
  pageUrl: string;
  title?: string;
  shareText?: string;
  /** vote-card: 中央タイトル+太字ラベル / collection: 右上クローズ+通常ラベル */
  variant?: "vote-card" | "collection";
};

export default function ShareSheet({
  open,
  onClose,
  pageUrl,
  title = "シェア",
  shareText = "VOTE",
  variant = "vote-card",
}: ShareSheetProps) {
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
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    onClose();
  }, [pageUrl, shareText, onClose]);

  const isVoteCard = variant === "vote-card";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      portal
      backdropZIndex={Z_INDEX.shareBackdrop}
      panelZIndex={Z_INDEX.sharePanel}
      safeAreaBottom={!isVoteCard}
      rounded={isVoteCard ? "sheet" : "card"}
      fontBold={isVoteCard}
      panelClassName={
        isVoteCard
          ? "max-md:pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
          : "max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3"
      }
      header={
        isVoteCard ? (
          <ModalTitleHeader title={title} onClose={onClose} />
        ) : (
          <ModalCloseRightHeader title={title} onClose={onClose} />
        )
      }
      headerVariant="none"
    >
      <ul className={isVoteCard ? "px-5 py-2" : "border-t border-gray-100"}>
        <li className={isVoteCard ? "border-b border-gray-100" : undefined}>
          <button
            type="button"
            className={`flex w-full items-center gap-3 text-left transition-colors hover:bg-gray-50 ${
              isVoteCard ? "py-4" : "px-4 py-4 text-sm font-medium text-[#191919] active:bg-gray-50"
            }`}
            onClick={() => void copyLink()}
          >
            <LinkIcon className={`shrink-0 ${isVoteCard ? "text-gray-900" : "text-[#191919]"}`} />
            <span className={isVoteCard ? "card-options-modal-item-label text-sm font-bold text-gray-900" : undefined}>
              リンクをコピー
            </span>
          </button>
        </li>
        <li className={!isVoteCard ? "border-t border-gray-100" : undefined}>
          <button
            type="button"
            className={`flex w-full items-center gap-3 text-left transition-colors hover:bg-gray-50 ${
              isVoteCard ? "py-4" : "px-4 py-4 text-sm font-medium text-[#191919] active:bg-gray-50"
            }`}
            onClick={shareToX}
          >
            <XLogoIcon className={`shrink-0 ${isVoteCard ? "text-gray-900" : "text-[#191919]"}`} />
            <span className={isVoteCard ? "card-options-modal-item-label text-sm font-bold text-gray-900" : undefined}>
              Xにシェア
            </span>
          </button>
        </li>
      </ul>
    </BottomSheet>
  );
}

export function useSharePageUrl(path: string): string {
  return useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${path}`;
  }, [path]);
}
