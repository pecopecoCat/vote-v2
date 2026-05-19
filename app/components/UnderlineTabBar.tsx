"use client";

import type { CSSProperties } from "react";

/** 未選択タブ（テキスト・アイコン共通） */
export const TAB_COLOR_INACTIVE = "var(--color-text-gray)"; /* #787878 */
/** 選択中タブ */
export const TAB_COLOR_ACTIVE = "var(--color-brand-logo)"; /* #191919 */

export type UnderlineTabIcon =
  | {
      type: "mask";
      src: string;
      width: number;
      height: number;
    }
  | {
      type: "img";
      src: string;
      /** 選択時だけ差し替える画像（例: お気に入りタグの赤ハート） */
      activeSrc?: string;
      width: number;
      height: number;
    };

export type UnderlineTabItem<T extends string> = {
  id: T;
  label: string;
  icon?: UnderlineTabIcon;
};

export type UnderlineTabBarLayout = "scroll" | "equal" | "center";

export type UnderlineTabBarProps<T extends string> = {
  items: UnderlineTabItem<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  ariaLabel: string;
  /** scroll: 検索（横スクロール可） / equal: マイページ（等分） / center: HOME フィード */
  layout?: UnderlineTabBarLayout;
  className?: string;
  /** タブ行の背景（デフォルト: layout により white または #F1F1F1） */
  backgroundClassName?: string;
  /** 黄インジケーター（デフォルト 3px。マイページは 4px + rounded） */
  indicatorClassName?: string;
  /** ラベル文字サイズ */
  labelClassName?: string;
  /** center レイアウト時の nav 余白（HOME 用） */
  navStyle?: CSSProperties;
};

function TabIcon({ icon, active }: { icon: UnderlineTabIcon; active: boolean }) {
  if (icon.type === "img" && active && icon.activeSrc) {
    return (
      <img
        src={icon.activeSrc}
        alt=""
        className="flex-none"
        width={icon.width}
        height={icon.height}
        aria-hidden
      />
    );
  }

  if (icon.type === "mask") {
    return (
      <span
        className="tab-bar-icon-mask inline-block flex-none"
        style={{
          width: icon.width,
          height: icon.height,
          WebkitMaskImage: `url(${icon.src})`,
          maskImage: `url(${icon.src})`,
        }}
        data-active={active ? "true" : "false"}
        aria-hidden
      />
    );
  }

  const src = icon.type === "img" ? icon.src : "";
  if (active) {
    return (
      <span
        className="tab-bar-icon-mask inline-block flex-none"
        style={{
          width: icon.width,
          height: icon.height,
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
        }}
        data-active="true"
        aria-hidden
      />
    );
  }

  return (
    <span
      className="tab-bar-icon-mask inline-block flex-none"
      style={{
        width: icon.width,
        height: icon.height,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
      data-active="false"
      aria-hidden
    />
  );
}

const DEFAULT_INDICATOR = "absolute bottom-0 left-0 right-0 h-[3px] bg-[#FFE100]";
const PROFILE_INDICATOR = "absolute bottom-0 left-0 right-0 h-[4px] rounded-full bg-[#FFE100]";

export default function UnderlineTabBar<T extends string>({
  items,
  activeId,
  onSelect,
  ariaLabel,
  layout = "scroll",
  className = "",
  backgroundClassName,
  indicatorClassName,
  labelClassName = "text-sm",
  navStyle,
}: UnderlineTabBarProps<T>) {
  const indicator = indicatorClassName ?? (layout === "equal" ? PROFILE_INDICATOR : DEFAULT_INDICATOR);
  const bg = backgroundClassName ?? (layout === "center" ? "bg-[#F1F1F1]" : "bg-white");

  const renderButton = (item: UnderlineTabItem<T>) => {
    const active = activeId === item.id;
    const colorStyle = { color: active ? TAB_COLOR_ACTIVE : TAB_COLOR_INACTIVE };

    const baseBtn =
      layout === "equal"
        ? `relative flex min-w-0 flex-1 items-center justify-center gap-1.5 pt-[14.4px] pb-[11.4px] font-bold w-full text-center ${labelClassName}`
        : layout === "center"
          ? `relative inline-flex items-center justify-center gap-1.5 pb-[8px] leading-snug text-[15px] ${active ? "font-bold" : "font-normal"}`
          : `relative inline-flex min-h-[3.25rem] flex-none items-center gap-1.5 whitespace-nowrap font-bold ${labelClassName}`;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelect(item.id)}
        className={`${baseBtn} transition-colors`}
        style={colorStyle}
        aria-current={active ? "page" : undefined}
      >
        {item.icon ? <TabIcon icon={item.icon} active={active} /> : null}
        <span className={layout === "scroll" ? "whitespace-nowrap" : "min-w-0 truncate"}>
          {item.label}
        </span>
        {active ? <span className={indicator} aria-hidden /> : null}
      </button>
    );
  };

  if (layout === "scroll") {
    return (
      <div
        className={`w-full overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${bg} ${className}`}
      >
        <nav
          className="flex w-max min-w-full shrink-0 flex-nowrap items-stretch justify-center gap-5 px-[5.333vw]"
          aria-label={ariaLabel}
        >
          {items.map(renderButton)}
        </nav>
      </div>
    );
  }

  if (layout === "equal") {
    return (
      <div className={`w-full min-w-0 ${className}`}>
        <nav className={`profile-tab-bar flex w-full ${bg}`} aria-label={ariaLabel}>
          {items.map(renderButton)}
        </nav>
      </div>
    );
  }

  return (
    <div className={`w-full min-w-0 ${className}`}>
      <nav
        className={`feed-tab-label flex w-full justify-center gap-6 border-b border-gray-200 ${bg}`}
        style={navStyle}
        aria-label={ariaLabel}
      >
        {items.map(renderButton)}
      </nav>
    </div>
  );
}
