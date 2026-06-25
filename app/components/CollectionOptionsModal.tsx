"use client";

import { useMemo } from "react";
import { OptionsMenuModal, type OptionsMenuItem } from "./modal";

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
  const items = useMemo(() => {
    const list: OptionsMenuItem[] = [];

    if (showShare && onShare) {
      list.push({
        key: "share",
        label: "シェアする",
        icon: <img src="/icons/icon_share.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={21} />,
        onClick: () => {
          onClose();
          onShare();
        },
      });
    }

    if (!hideEdit) {
      list.push({
        key: "edit",
        label: "設定を変更",
        icon: <img src="/icons/icon_setting.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={20} />,
        onClick: () => {
          onClose();
          onEdit();
        },
      });
    }

    list.push({
      key: "delete",
      label: deleteLabel,
      icon: <img src="/icons/icon_trash.svg" alt="" className="h-[18px] w-[18px] shrink-0" width={18} height={18} />,
      onClick: () => {
        onDelete();
        onClose();
      },
    });

    return list;
  }, [showShare, onShare, hideEdit, deleteLabel, onClose, onEdit, onDelete]);

  return <OptionsMenuModal open items={items} onClose={onClose} ariaLabel="コレクションメニュー" />;
}
