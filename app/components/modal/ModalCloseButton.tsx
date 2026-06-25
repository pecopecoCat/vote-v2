"use client";

type ModalCloseButtonProps = {
  onClose: () => void;
  className?: string;
};

/** モーダル共通：右上配置用。固定サイズ（vw スケールしない） */
export function ModalCloseButton({ onClose, className = "" }: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      className={`flex h-10 w-10 shrink-0 items-center justify-center text-[var(--color-select-b)] transition-opacity hover:opacity-80 ${className}`}
      aria-label="閉じる"
      onClick={onClose}
    >
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      </svg>
    </button>
  );
}
