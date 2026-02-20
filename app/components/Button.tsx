"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

const fontClass = "btn-font font-bold";

export type ButtonVariant =
  | "createVote"   // VOTEを作成: 黄・黒文字・フラット
  | "yellow"       // 黄色ボタン: 黄・黒文字・フラット
  | "blackLarge"   // 大サイズ黒: 黒・白文字 60px
  | "blackMedium"  // 中サイズ黒: 黒・白文字 44px
  | "pill"         // 小サイズ丸: 黒(active) / グレー(inactive)
  | "outline"      // 新しいコレクションを追加: 白・グレー枠・黒文字
  | "buttonS";     // 小: 選択時は黄枠・薄黄背景 / 非選択は白・グレー枠（公開設定など）

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant: ButtonVariant;
  /** pill / buttonS のとき: true=選択中、false=非選択 */
  active?: boolean;
  children: ReactNode;
  className?: string;
}

const defaultButtonType = "button" as const;

const variantStyles: Record<
  ButtonVariant,
  string | ((active?: boolean) => string)
> = {
  createVote: [
    "h-12 w-full min-h-[52px] rounded-[10px]",
    "bg-[#FFE100] text-[#191919]",
    "disabled:bg-[#E5E7EB] disabled:text-[#787878]",
  ].join(" "),
  yellow: [
    "h-12 min-h-[48px] rounded-[10px] px-6",
    "bg-[#FFE100] text-[#191919]",
    "hover:opacity-95 active:opacity-90",
  ].join(" "),
  blackLarge: [
    "h-[60px] min-h-[60px] rounded-[10px] px-6",
    "bg-black text-white",
    "hover:opacity-95 active:opacity-90",
  ].join(" "),
  blackMedium: [
    "h-[44px] min-h-[44px] rounded-[10px] px-5",
    "bg-black text-white",
    "hover:opacity-95 active:opacity-90",
  ].join(" "),
  pill: (active = true) =>
    [
      "h-[34px] min-h-[34px] rounded-full px-5",
      active
        ? "bg-black text-white hover:opacity-95 active:opacity-90"
        : "bg-[#E5E7EB] text-[#787878] cursor-not-allowed",
    ].join(" "),
  outline: [
    "h-[60px] min-h-[60px] rounded-xl px-5",
    "bg-white border border-[#D9D9D9] text-[#191919]",
    "hover:bg-gray-50 active:bg-gray-100",
  ].join(" "),
  buttonS: (active = false) =>
    [
      "flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-colors min-h-[44px]",
      active
        ? "border-[#FFE100] bg-[#FFF9CC] text-gray-900"
        : "border-[#D9D9D9] bg-white text-gray-600 hover:bg-gray-50",
    ].join(" "),
};

export default function Button({
  variant,
  active = true,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center text-center transition-opacity " +
    fontClass;
  const variantStyle =
    typeof variantStyles[variant] === "function"
      ? (variantStyles[variant] as (active?: boolean) => string)(
          variant === "pill" || variant === "buttonS" ? active : undefined
        )
      : (variantStyles[variant] as string);
  const isPillDisabled = variant === "pill" && !active;
  const isDisabled = disabled ?? isPillDisabled;
  const { type = defaultButtonType, ...buttonRest } = rest;

  return (
    <button
      type={type}
      className={`${base} ${variantStyle} ${className}`.trim()}
      disabled={isDisabled}
      {...buttonRest}
    >
      {children}
    </button>
  );
}
