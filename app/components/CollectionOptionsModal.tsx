"use client";

export interface CollectionOptionsModalProps {
  /** メンバー限定コレクションのとき true（VOTEカードの「シェアする」と同様に X で URL 共有） */
  showShare?: boolean;
  collectionId?: string;
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
  collectionId,
  hideEdit = false,
  deleteLabel = "コレクションを削除",
  onClose,
  onEdit,
  onDelete,
}: CollectionOptionsModalProps) {
  const handleShare = () => {
    if (typeof window !== "undefined" && collectionId) {
      const url = `${window.location.origin}/collection/${encodeURIComponent(collectionId)}`;
      const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=VOTE`;
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" aria-hidden onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] pt-4 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 pb-3">
          <span className="text-sm font-bold text-gray-900" aria-hidden />
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
        <ul className="border-t border-gray-100 divide-y divide-gray-100">
          {showShare && collectionId ? (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-4 text-left text-gray-900 transition-colors hover:bg-gray-50 active:bg-gray-50"
                onClick={handleShare}
              >
                <img src="/icons/icon_share.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={21} />
                <span className="card-options-modal-item-label text-sm text-gray-900">シェアする</span>
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
                onClose();
                onDelete();
              }}
            >
              <img src="/icons/icon_trash.svg" alt="" className="h-[18px] w-[18px] shrink-0" width={18} height={18} />
              {deleteLabel}
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}
