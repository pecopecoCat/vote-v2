"use client";

import type { ReactNode } from "react";
import BottomSheet from "../BottomSheet";

export type OptionsMenuItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

type OptionsMenuModalProps = {
  open: boolean;
  onClose: () => void;
  items: OptionsMenuItem[];
  ariaLabel?: string;
};

/** 右上クローズ + 区切りリスト（コレクション／コメント等のオプションメニュー） */
export default function OptionsMenuModal({ open, onClose, items, ariaLabel = "メニュー" }: OptionsMenuModalProps) {
  if (!open || items.length === 0) return null;

  return (
    <BottomSheet
      open
      onClose={onClose}
      headerVariant="close-right"
      rounded="card"
      safeAreaBottom
      ariaLabel={ariaLabel}
    >
      <ul className="divide-y divide-gray-100 border-t border-gray-100">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-gray-900 transition-colors hover:bg-gray-50 active:bg-gray-50"
              onClick={item.onClick}
            >
              {item.icon}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
