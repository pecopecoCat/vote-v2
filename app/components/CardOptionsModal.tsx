"use client";

export interface CardOptionsModalProps {
  cardId: string | null;
  onClose: () => void;
  /** 自分で作ったカードのとき true。このとき「非表示する」「報告する」は表示しない */
  isOwnCard?: boolean;
  onShare?: (cardId: string) => void;
  onHide?: (cardId: string) => void;
  onReport?: (cardId: string) => void;
}

export default function CardOptionsModal({
  cardId,
  onClose,
  isOwnCard = false,
  onShare,
  onHide,
  onReport,
}: CardOptionsModalProps) {
  if (cardId == null) return null;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/comments/${cardId}`;
      const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=VOTE`;
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
    onShare?.(cardId);
    onClose();
  };

  const allItems = [
    {
      label: "シェアする",
      icon: <img src="/icons/icon_share.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={21} />,
      onClick: handleShare,
    },
    {
      label: "非表示する",
      icon: (
        <img
          src="/icons/icon_notshow.svg"
          alt=""
          className="h-5 w-auto shrink-0 object-contain"
          width={22}
          height={18}
        />
      ),
      onClick: () => {
        onHide?.(cardId);
        onClose();
      },
    },
    {
      label: "報告する",
      icon: (
        <img
          src="/icons/icon_alert.svg"
          alt=""
          className="h-5 w-5 shrink-0 object-contain"
          width={20}
          height={18}
        />
      ),
      onClick: () => {
        onReport?.(cardId);
        onClose();
      },
    },
  ];

  const items = isOwnCard ? allItems.slice(0, 1) : allItems;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-[30px] bg-white font-bold shadow-lg">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-100 px-5 py-3">
          <div />
          <span className="text-lg font-bold text-gray-900">メニュー</span>
          <div className="flex justify-end">
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
        </div>
        <div className="px-5 py-2">
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 py-4 text-left text-gray-900 transition-colors hover:bg-gray-50"
                  onClick={item.onClick}
                >
                  {item.icon}
                  <span className="card-options-modal-item-label text-sm text-gray-900">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

