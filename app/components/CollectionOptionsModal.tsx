"use client";

import BottomSheet from "./BottomSheet";

export interface CollectionOptionsModalProps {
  /** メンバー限定コレクションのとき true */
  showShare?: boolean;
  /** シェアするタップ時（半モーダル：リンクコピー / X にシェア） */
  onShare?: () => void;
  /** 参加中の他人コレクションのとき true（設定変更を出さない） */
  hideEdit?: boolean;
  /** 削除ボタンの文言（参加中はマイリストから外す意味に変更可） */
  deleteLabel?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CollectionOptionsModal({
  showShare = false,
  onShare,
  hideEdit = false,
  deleteLabel = "コレクションを削除",
  onClose,
  onEdit,
  onDelete,
}: CollectionOptionsModalProps) {
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
        {showShare && onShare ? (
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-bold text-gray-900 transition-colors hover:bg-gray-50 active:bg-gray-50"
              onClick={() => {
                onClose();
                onShare();
              }}
            >
              <img src="/icons/icon_share.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={21} />
              シェアする
            </button>
          </li>
        ) : null}
        {!hideEdit ? (
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-gray-900 active:bg-gray-50"
              onClick={() => {
                onClose();
                onEdit();
              }}
            >
              <img src="/icons/icon_setting.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={20} />
              設定を変更
            </button>
          </li>
        ) : null}
        <li>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-gray-900 active:bg-gray-50"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            <img src="/icons/icon_trash.svg" alt="" className="h-[18px] w-[18px] shrink-0" width={18} height={18} />
            {deleteLabel}
          </button>
        </li>
      </ul>
    </BottomSheet>
  );
}
