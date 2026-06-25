"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "../lib/zIndex";

type BottomSheetRounded = "sheet" | "card";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  ariaLabel?: string;
  /** デフォルトの中央タイトルヘッダーを差し替え */
  header?: ReactNode;
  /** close-right: 右上クローズのみ / none: ヘッダーなし */
  headerVariant?: "title" | "close-right" | "none";
  rounded?: BottomSheetRounded;
  portal?: boolean;
  backdropZIndex?: number;
  panelZIndex?: number;
  /** iOS キーボード表示時にパネルを持ち上げる */
  trackKeyboard?: boolean;
  safeAreaBottom?: boolean;
  fontBold?: boolean;
  panelClassName?: string;
};

export function BottomSheetCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center"
      aria-label="閉じる"
      onClick={onClose}
    >
      <img src="/icons/icon_close.svg" alt="" className="icon-close-responsive" width={14} height={14} />
    </button>
  );
}

function BottomSheetTitleHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-100 px-5 py-3">
      <div />
      <span className="text-lg font-bold text-gray-900">{title}</span>
      <div className="flex justify-end">
        <BottomSheetCloseButton onClose={onClose} />
      </div>
    </div>
  );
}

function BottomSheetCloseRightHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg items-center justify-end px-4 pb-3">
      <BottomSheetCloseButton onClose={onClose} />
    </div>
  );
}

export default function BottomSheet({
  open,
  onClose,
  children,
  title,
  ariaLabel,
  header,
  headerVariant = "title",
  rounded = "sheet",
  portal = false,
  backdropZIndex = Z_INDEX.bottomSheetBackdrop,
  panelZIndex = Z_INDEX.bottomSheetPanel,
  trackKeyboard = false,
  safeAreaBottom = false,
  fontBold = true,
  panelClassName = "",
}: BottomSheetProps) {
  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0);

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
    if (!open || !trackKeyboard) return;
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
  }, [open, trackKeyboard]);

  if (!open) return null;

  const roundedClass =
    rounded === "card"
      ? "rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
      : "rounded-t-[30px] shadow-lg";

  const panelPadding = safeAreaBottom ? "pb-[env(safe-area-inset-bottom)]" : "";
  const fontClass = fontBold ? "font-bold" : "";

  const resolvedHeader =
    header ??
    (headerVariant === "title" && title ? (
      <BottomSheetTitleHeader title={title} onClose={onClose} />
    ) : headerVariant === "close-right" ? (
      <BottomSheetCloseRightHeader onClose={onClose} />
    ) : null);

  const content = (
    <>
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: backdropZIndex }}
        aria-hidden
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 max-h-[85vh] overflow-hidden bg-white ${roundedClass} ${fontClass} ${panelPadding} ${panelClassName}`}
        style={{
          zIndex: panelZIndex,
          bottom: trackKeyboard ? keyboardInsetPx : undefined,
          transition: trackKeyboard ? "bottom 160ms ease-out" : undefined,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
      >
        {resolvedHeader}
        {children}
      </div>
    </>
  );

  if (portal && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}
