"use client";

import { useEffect } from "react";

export interface SuccessModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
  /** 指定時はこの秒数後に自動で onClose を呼ぶ */
  autoCloseSeconds?: number;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}

export default function SuccessModal({
  open,
  message,
  onClose,
  autoCloseSeconds,
}: SuccessModalProps) {
  useEffect(() => {
    if (!open || autoCloseSeconds == null) return;
    const t = setTimeout(onClose, autoCloseSeconds * 1000);
    return () => clearTimeout(t);
  }, [open, autoCloseSeconds, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="relative flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-8 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-modal-message"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white">
          <CheckIcon className="h-8 w-8" />
        </span>
        <p id="success-modal-message" className="text-center text-base font-bold text-gray-900">
          {message}
        </p>
      </div>
    </div>
  );
}
