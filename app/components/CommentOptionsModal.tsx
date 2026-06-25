"use client";

import { useMemo } from "react";
import { OptionsMenuModal, type OptionsMenuItem } from "./modal";

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
  const items = useMemo(() => {
    const list: OptionsMenuItem[] = [];

    if (showDelete) {
      list.push({
        key: "delete",
        label: "削除する",
        icon: <img src="/icons/icon_trash.svg" alt="" className="h-[18px] w-[18px] shrink-0" width={18} height={18} />,
        onClick: () => {
          onClose();
          onDelete();
        },
      });
    }

    list.push({
      key: "report",
      label: "違反報告",
      icon: <img src="/icons/icon_alert.svg" alt="" className="h-5 w-5 shrink-0 object-contain" width={20} height={18} />,
      onClick: () => {
        onClose();
        onReport();
      },
    });

    return list;
  }, [showDelete, onClose, onDelete, onReport]);

  return <OptionsMenuModal open items={items} onClose={onClose} ariaLabel="コメントメニュー" />;
}
