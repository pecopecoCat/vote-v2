"use client";

import { useEffect, useMemo, type ReactNode } from "react";

export interface CardOptionsModalProps {
  cardId: string | null;
  onClose: () => void;
  /** 自分で作ったカードのとき true。このとき「非表示する」「報告する」は表示しない */
  isOwnCard?: boolean;
  /** 指定時は「コミュニティに追加」を表示 */
  onAddToCommunity?: (cardId: string) => void;
  onHide?: (cardId: string) => void;
  onReport?: (cardId: string) => void;
}

export default function CardOptionsModal({
  cardId,
  onClose,
  isOwnCard = false,
  onAddToCommunity,
  onHide,
  onReport,
}: CardOptionsModalProps) {
  const items = useMemo(() => {
    if (cardId == null) return [];
    const list: Array<{
      label: string;
      icon: ReactNode;
      onClick: () => void;
    }> = [];

    if (onAddToCommunity) {
      list.push({
        label: "コレクションに追加",
        icon: (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFE100]">
            <img src="/icons/icon_plus.svg" alt="" className="h-2.5 w-2.5" width={10} height={10} />
          </span>
        ),
        onClick: () => {
          onAddToCommunity(cardId);
          onClose();
        },
      });
    }

    if (!isOwnCard) {
      list.push(
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
        }
      );
    }

    return list;
  }, [isOwnCard, cardId, onAddToCommunity, onHide, onReport, onClose]);

  useEffect(() => {
    if (cardId != null && items.length === 0) {
      onClose();
    }
  }, [cardId, items.length, onClose]);

  if (cardId == null || items.length === 0) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-hidden rounded-t-[30px] bg-white font-bold shadow-lg">
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

