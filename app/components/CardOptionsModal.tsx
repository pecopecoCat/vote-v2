"use client";

export interface CardOptionsModalProps {
  cardId: string | null;
  onClose: () => void;
  onShare?: (cardId: string) => void;
  onHide?: (cardId: string) => void;
  onReport?: (cardId: string) => void;
}

export default function CardOptionsModal({
  cardId,
  onClose,
  onShare,
  onHide,
  onReport,
}: CardOptionsModalProps) {
  if (cardId == null) return null;

  const items = [
    {
      label: "シェアする",
      icon: <img src="/icons/icon_share.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={21} />,
      onClick: () => {
        onShare?.(cardId);
        onClose();
      },
    },
    {
      label: "非表示する",
      icon: <img src="/icons/icon_alert.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={18} />,
      onClick: () => {
        onHide?.(cardId);
        onClose();
      },
    },
    {
      label: "報告する",
      icon: <img src="/icons/icon_notshow.svg" alt="" className="h-5 w-5 shrink-0" width={22} height={18} />,
      onClick: () => {
        onReport?.(cardId);
        onClose();
      },
    },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-[30px] bg-white shadow-lg">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-100 px-5 py-3">
          <div />
          <span className="text-lg font-bold text-gray-900">メニュー</span>
          <div className="flex justify-end">
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
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

