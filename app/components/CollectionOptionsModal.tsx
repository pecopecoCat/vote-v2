"use client";

export interface CollectionOptionsModalProps {
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CollectionOptionsModal({
  onClose,
  onEdit,
  onDelete,
}: CollectionOptionsModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" aria-hidden onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] pt-4 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 pb-3">
          <span className="text-sm font-bold text-gray-900" aria-hidden />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center text-blue-600"
            aria-label="閉じる"
            onClick={onClose}
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <ul className="border-t border-gray-100">
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
              コレクションを削除
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}
