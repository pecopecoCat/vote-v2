"use client";

import BottomSheet from "./BottomSheet";

export interface CommentOptionsModalProps {
  /** 自分のコメント・リプライのとき true（削除を出す） */
  showDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
  onReport: () => void;
}

export default function CommentOptionsModal({
  showDelete,
  onClose,
  onDelete,
  onReport,
}: CommentOptionsModalProps) {
  return (
    <BottomSheet
      open
      onClose={onClose}
      headerVariant="close-right"
      rounded="card"
      safeAreaBottom
      panelClassName="pt-4"
    >
      <ul className="divide-y divide-gray-100 border-t border-gray-100">
        {showDelete ? (
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-gray-900 active:bg-gray-50"
              onClick={() => {
                onClose();
                onDelete();
              }}
            >
              <img src="/icons/icon_trash.svg" alt="" className="h-[18px] w-[18px] shrink-0" width={18} height={18} />
              削除する
            </button>
          </li>
        ) : null}
        <li>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-gray-900 active:bg-gray-50"
            onClick={() => {
              onClose();
              onReport();
            }}
          >
            <img src="/icons/icon_alert.svg" alt="" className="h-5 w-5 shrink-0 object-contain" width={20} height={18} />
            違反報告
          </button>
        </li>
      </ul>
    </BottomSheet>
  );
}
