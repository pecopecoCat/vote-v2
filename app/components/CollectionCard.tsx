"use client";

import { memo } from "react";
import Link from "next/link";
import { getCollectionGradientClass, getCollectionGradientStyle } from "../data/search";
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
  /** 一覧で並ぶときは false 推奨（true だと表示件数分 /collection/* が一斉 prefetch される） */
  prefetch?: boolean;
  /** タイトルを白文字・黒ブロックで表示（マリオカード用）。title に \n で改行可能 */
  titleVariant?: "default" | "blackBlock";
  /** 人気コレクション枠：タイムラインのコレバナーに寄せた黒地＋白字（21px 基準の 81% = 0.9×0.9） */
  popularBanner?: boolean;
  /** 右上のラベル（例: コミュニティ）。角丸・薄い背景付き */
  label?: string;
  /** タイムライン用バナー：W335px相当・H260px・タイトルは黒地＋白字・26px */
  timelineBanner?: boolean;
  /** HOMEフィード用：VOTEカードと同幅のグリッドタイル・黒地白字 */
  feedTile?: boolean;
  /** コレクション一覧：全面グラデ＋黒字タイトル＋右ピン（白丸） */
  listPage?: boolean;
}


function CollectionCard({
  id,
  title,
  gradient = "orange-yellow",
  showPin = false,
  href,
  prefetch = false,
  titleVariant = "default",
  popularBanner = false,
  label,
  timelineBanner = false,
  feedTile = false,
  listPage = false,
}: CollectionCardProps) {
  const gradientClass = getCollectionGradientClass(gradient);
  const gradientStyle = getCollectionGradientStyle(gradient);
  const isBlackBlock = titleVariant === "blackBlock" || timelineBanner || feedTile;
  /** 検索の人気コレ：全面グラデ＋左は黒ラベル（白字）＋右はピン（仕様画像どおり） */
  const popularBlackBlock = popularBanner && !timelineBanner && !listPage;
  /** 人気コレ行：article 自体がグラデバー（細リングではなく全面） */
  const popularGradientRow = popularBlackBlock;

  const content = (
    <article
      style={feedTile ? gradientStyle : undefined}
      className={`relative w-full ${
        listPage
          ? `collection-card-list-page flex min-h-[72px] items-center justify-between gap-3 overflow-hidden rounded-[10px] bg-gradient-to-r ${gradientClass} px-5 py-5 sm:min-h-[88px]`
          : popularGradientRow
          ? `overflow-visible rounded-[10px] flex items-center bg-gradient-to-r ${gradientClass} p-[20px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.16)]`
          : feedTile
            ? "collection-card-feed-tile flex flex-col justify-center overflow-hidden px-4 py-4 md:py-[31px]"
            : `overflow-hidden rounded-[18px]`
      } ${
        feedTile
          ? ""
          : timelineBanner
            ? "h-[260px] min-h-[260px] px-5 py-5"
            : popularGradientRow || listPage
              ? ""
              : "min-h-[72px]"
      } ${
        popularGradientRow || listPage
          ? ""
          : isBlackBlock && !timelineBanner && !feedTile
            ? "bg-gradient-to-br from-[#c2410c] via-orange-500 to-[#fde047] px-5 py-12"
            : isBlackBlock && timelineBanner
              ? `bg-gradient-to-r ${gradientClass} flex flex-col justify-center`
              : isBlackBlock && feedTile
                ? ""
                : isBlackBlock
                ? "bg-gradient-to-br from-[#c2410c] via-orange-500 to-[#fde047] px-5 py-12"
                : `bg-gradient-to-r ${gradientClass} px-5 py-4`
      } ${!timelineBanner && !feedTile && !popularGradientRow && !listPage ? "flex items-center" : ""}`}
    >
      {label && (
        <span
          className="absolute right-3 top-3 z-10 rounded-[9999px] bg-white/90 px-2.5 py-1 text-xs font-bold text-gray-900"
          aria-hidden
        >
          {label}
        </span>
      )}
      {showPin && !popularBlackBlock && !listPage && (
        <span
          className={`absolute top-1/2 z-10 h-5 w-5 -translate-y-1/2 ${label ? "right-[5.75rem]" : "right-6"}`}
          style={{
            backgroundColor: "#191919",
            mask: "url(/icons/icon_pin.svg) no-repeat center/contain",
            WebkitMask: "url(/icons/icon_pin.svg) no-repeat center/contain",
          }}
          aria-hidden
        />
      )}
      {isBlackBlock ? (
        <div
          className={`w-full rounded-none bg-black px-4 text-left ${
            feedTile ? "py-[42px]" : "py-3"
          }`}
        >
          <p
            className={`whitespace-pre-line font-bold leading-snug text-[#ffffff] ${
              feedTile ? "text-lg md:text-xl" : timelineBanner ? "text-[26px]" : "text-[28px]"
            }`}
          >
            {title}
          </p>
        </div>
      ) : popularBlackBlock ? (
        <div className="flex w-full min-w-0 items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex max-w-full items-center rounded-none bg-black px-3 py-1 sm:px-3.5 sm:py-1">
              <p
                className="whitespace-pre-line text-left font-bold leading-snug text-white [font-size:min(18px,calc(100vw*18/375))]"
              >
                {title}
              </p>
            </div>
          </div>
          {showPin ? (
            <img
              src="/icons/icon_pin.svg"
              alt=""
              className="h-5 w-5 shrink-0"
              width={20}
              height={20}
              aria-hidden
            />
          ) : null}
        </div>
      ) : listPage ? (
        <>
          <p className="min-w-0 flex-1 whitespace-pre-line text-left text-base font-bold leading-snug text-[#191919]">
            {title}
          </p>
          {showPin ? (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white"
              aria-hidden
            >
              <img src="/icons/icon_pin.svg" alt="" className="h-[18px] w-[18px]" width={18} height={18} />
            </span>
          ) : null}
        </>
      ) : (
        <p className={`text-sm font-bold text-[#191919] ${showPin ? "pr-12" : ""}`.trim()}>{title}</p>
      )}
    </article>
  );

  if (href) {
    return (
      <Link href={href} prefetch={prefetch} className="block min-w-0">
        {content}
      </Link>
    );
  }
  return content;
}

export default memo(CollectionCard);
