"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import BottomSheet from "./BottomSheet";

export interface CardOptionsModalProps {
  cardId: string | null;
  onClose: () => void;
  /** 自分で作ったカードのとき true。このとき「非表示する」「報告する」は表示しない */
  isOwnCard?: boolean;
  onHide?: (cardId: string) => void;
  onReport?: (cardId: string) => void;
}

export default function CardOptionsModal({
  cardId,
  onClose,
  isOwnCard = false,
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
  }, [isOwnCard, cardId, onHide, onReport, onClose]);

  useEffect(() => {
    if (cardId != null && items.length === 0) {
      onClose();
    }
  }, [cardId, items.length, onClose]);

  if (cardId == null || items.length === 0) return null;

  return (
    <BottomSheet open title="メニュー" onClose={onClose}>
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
    </BottomSheet>
  );
}
