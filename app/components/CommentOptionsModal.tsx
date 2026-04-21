"use client";

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
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" aria-hidden onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] pt-4 font-bold shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-lg items-center justify-end px-4 pb-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center"
            aria-label="閉じる"
            onClick={onClose}
          >
            <img
              src="/icons/icon_close.svg"
              alt=""
              className="icon-close-responsive"
              width={14}
              height={14}
            />
          </button>
        </div>
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
      </div>
    </>
  );
}
