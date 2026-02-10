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
      icon: <ShareIcon className="h-5 w-5 text-gray-900" />,
      onClick: () => {
        onShare?.(cardId);
        onClose();
      },
    },
    {
      label: "非表示にする",
      icon: <HideIcon className="h-5 w-5 text-gray-900" />,
      onClick: () => {
        onHide?.(cardId);
        onClose();
      },
    },
    {
      label: "報告する",
      icon: <ReportIcon className="h-5 w-5 text-gray-900" />,
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

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function HideIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function ReportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
