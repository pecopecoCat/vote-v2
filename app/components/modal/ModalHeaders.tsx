"use client";

import { ModalCloseButton } from "./ModalCloseButton";

export function ModalTitleHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-100 px-5 py-3">
      <div />
      <span className="text-lg font-bold text-gray-900">{title}</span>
      <div className="flex justify-end">
        <ModalCloseButton onClose={onClose} />
      </div>
    </div>
  );
}

/** タイトルなし・閉じるボタンのみ右上 */
export function ModalCloseRightHeader({ onClose, title }: { onClose: () => void; title?: string }) {
  return (
    <div className="flex w-full items-center justify-end px-4 pb-2 pt-3">
      {title ? <span className="sr-only">{title}</span> : null}
      <ModalCloseButton onClose={onClose} />
    </div>
  );
}
