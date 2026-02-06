"use client";

import Link from "next/link";
import { getCollectionGradientClass } from "../data/search";
import type { CollectionGradient } from "../data/search";

export interface CollectionCardProps {
  id?: string;
  title: string;
  /** グラデーション（未指定時はデフォルト） */
  gradient?: CollectionGradient;
  /** ピン（注目）アイコンを表示するか */
  showPin?: boolean;
  /** リンク先（指定時は Link でラップ） */
  href?: string;
  /** タイトルを白文字・黒ブロックで表示（マリオカード用）。title に \n で改行可能 */
  titleVariant?: "default" | "blackBlock";
  /** 右上のラベル（例: コレクション）。角丸・薄い背景付き */
  label?: string;
}


export default function CollectionCard({
  id,
  title,
  gradient = "orange-yellow",
  showPin = false,
  href,
  titleVariant = "default",
  label,
}: CollectionCardProps) {
  const gradientClass = getCollectionGradientClass(gradient);
  const isBlackBlock = titleVariant === "blackBlock";

  const content = (
    <article
      className={`relative w-full overflow-hidden rounded-[10px] min-h-[72px] ${
        isBlackBlock
          ? "bg-gradient-to-br from-[#c2410c] via-orange-500 to-[#fde047] px-5 py-12"
          : `bg-gradient-to-r ${gradientClass} px-5 py-4`
      } flex items-center`}
    >
      {label && (
        <span
          className="absolute right-3 top-3 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-bold text-gray-900"
          aria-hidden
        >
          {label}
        </span>
      )}
      {showPin && !label && (
        <span className="absolute right-6 top-1/2 -translate-y-1/2" aria-hidden>
          <img src="/icons/icon_pin.svg" alt="" className="h-5 w-5" width={22} height={22} />
        </span>
      )}
      {isBlackBlock ? (
        <div className="w-full rounded-none bg-black px-4 py-3 text-left">
          <p className="whitespace-pre-line text-[28px] font-bold leading-snug text-white">
            {title}
          </p>
        </div>
      ) : (
        <p className={`text-sm font-semibold text-gray-900 ${showPin ? "pr-12" : ""}`}>{title}</p>
      )}
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
