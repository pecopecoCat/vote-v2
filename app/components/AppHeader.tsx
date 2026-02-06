"use client";

import Link from "next/link";

export type AppHeaderType = "logo" | "search" | "hashtag" | "title";

export interface AppHeaderLogoProps {
  type: "logo";
}

export interface AppHeaderSearchProps {
  type: "search";
  value: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  backHref?: string;
}

export interface AppHeaderHashtagProps {
  type: "hashtag";
  value: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  backHref?: string;
  /** ハートタップでお気に入りに追加（タグ文字列を渡す） */
  onFavoriteClick?: (tag: string) => void;
  /** 現在のタグがお気に入りか（ハートを塗りつぶし表示） */
  isFavorite?: boolean;
}

export interface AppHeaderTitleProps {
  type: "title";
  title: string;
  backHref?: string;
  /** 右側のボタン（例: 下書きリンク） */
  right?: React.ReactNode;
}

export type AppHeaderProps =
  | AppHeaderLogoProps
  | AppHeaderSearchProps
  | AppHeaderHashtagProps
  | AppHeaderTitleProps;

/** 全ヘッダー共通の高さ（キーワード検索時の高さに統一） */
const HEADER_HEIGHT = "h-[64px]";
const HEADER_BASE = `sticky top-0 z-40 flex items-center bg-[#FFE100] px-[5.333vw] shadow-sm ${HEADER_HEIGHT}`;

/**
 * アプリ共通ヘッダー（4タイプ・高さ統一）
 * (1) logo: 中央にVOTEロゴ
 * (2) search: 気になるキーワードで検索（虫眼鏡・青バツ）
 * (3) hashtag: ハッシュタグ（#・ハート・戻る矢印）
 * (4) title: 中央にページタイトル（戻る＋タイトル＋任意で右要素）
 */
export default function AppHeader(props: AppHeaderProps) {
  if (props.type === "logo") {
    return (
      <header className={`${HEADER_BASE} justify-center`} aria-label="VOTE">
        <h1 className="flex items-center">
          <img
            src="/vote.svg"
            alt="VOTE"
            className="h-[26px] w-auto"
            width={200}
            height={64}
          />
        </h1>
      </header>
    );
  }

  if (props.type === "title") {
    const { title, backHref, right } = props;
    const BackButton = () => {
      const icon = (
        <img
          src="/icons/icon_back.svg"
          alt=""
          className="h-5 w-5"
          width={8}
          height={18}
        />
      );
      if (backHref != null) {
        return (
          <Link
            href={backHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-[#191919]"
            aria-label="戻る"
          >
            {icon}
          </Link>
        );
      }
      return (
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center text-[#191919]"
          aria-label="戻る"
          onClick={() => window.history.back()}
        >
          {icon}
        </button>
      );
    };
    return (
      <header className={`sticky top-0 z-40 relative flex ${HEADER_HEIGHT} items-center bg-[#FFE100] pl-2.5 pr-[5.333vw] shadow-sm`} aria-label={title}>
        <BackButton />
        <h1 className="absolute left-1/2 top-1/2 min-w-0 -translate-x-1/2 -translate-y-1/2 px-2 text-center text-base font-bold text-gray-900">
          {title}
        </h1>
        <div className="ml-auto flex shrink-0 items-center">
          {right ?? <span className="w-10" aria-hidden />}
        </div>
      </header>
    );
  }

  const isSearch = props.type === "search";
  const placeholder = isSearch ? "気になるキーワードで検索" : "ハッシュタグ";
  const backHref = "backHref" in props ? props.backHref : undefined;

  const BackButton = () => {
    const icon = (
      <img
        src="/icons/icon_back.svg"
        alt=""
        className="h-5 w-5"
        width={8}
        height={18}
      />
    );
    if (backHref != null) {
      return (
        <Link
          href={backHref}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-[#191919]"
          aria-label="戻る"
        >
          {icon}
        </Link>
      );
    }
    return (
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center text-[#191919]"
        aria-label="戻る"
        onClick={() => window.history.back()}
      >
        {icon}
      </button>
    );
  };

  return (
    <header
      className={`sticky top-0 z-40 flex ${HEADER_HEIGHT} items-center gap-2 bg-[#FFE100] py-3 pl-2.5 pr-[5.333vw] shadow-sm`}
      aria-label={isSearch ? "検索" : "ハッシュタグ"}
    >
      <BackButton />
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2">
        {isSearch ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
            <img
              src="/icons/icon_search.svg"
              alt=""
              className="shrink-0"
              style={{ width: "14px", height: "14px" }}
              width={9}
              height={9}
            />
          </span>
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
            <img
              src="/icons/icon_hash.svg"
              alt=""
              className="shrink-0"
              style={{ width: "12.6px", height: "14px" }}
              width={9}
              height={10}
            />
          </span>
        )}
        <input
          type="search"
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") props.onSubmit?.(props.value);
          }}
          placeholder={placeholder}
          className="search-header-input min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          aria-label={placeholder}
        />
        {isSearch ? (
          props.value.length > 0 && (
            <button
              type="button"
              className="shrink-0"
              aria-label="クリア"
              onClick={() => props.onChange?.("")}
            >
              <img
                src="/icons/icon_close.svg"
                alt=""
                className="h-4 w-4"
                width={15}
                height={15}
              />
            </button>
          )
        ) : (
          <button
            type="button"
            className="shrink-0"
            aria-label={props.isFavorite ? "お気に入りから削除" : "お気に入りに追加"}
            onClick={() => {
              const tag = props.value.trim();
              if (tag && props.onFavoriteClick) props.onFavoriteClick(tag);
            }}
          >
            <img
              src={props.isFavorite ? "/icons/icon_heart_on.svg" : "/icons/icon_heart.svg"}
              alt=""
              className="h-5 w-5"
              width={18}
              height={16}
            />
          </button>
        )}
      </div>
    </header>
  );
}
