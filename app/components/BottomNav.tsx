"use client";

import Link from "next/link";

/** スマホメイン用・下部固定ナビ。左から n_home, n_search, n_vote, n_news, n_mypage */
export type NavItemId = "home" | "search" | "add" | "notifications" | "profile";

export interface BottomNavProps {
  activeId?: NavItemId;
}

const navItems: { id: NavItemId; label: string; href?: string; src: string; srcOn: string }[] = [
  { id: "home", label: "ホーム", href: "/", src: "/icons/n_home.svg", srcOn: "/icons/n_home_on.svg" },
  { id: "search", label: "検索", href: "/search", src: "/icons/n_search.svg", srcOn: "/icons/n_search_on.svg" },
  { id: "add", label: "作成", href: "/create/form", src: "/icons/n_vote.svg", srcOn: "/icons/n_vote_on.svg" },
  { id: "notifications", label: "通知", href: "/notifications", src: "/icons/n_news.svg", srcOn: "/icons/n_news_on.svg" },
  { id: "profile", label: "プロフィール", href: "/profile", src: "/icons/n_mypage.svg", srcOn: "/icons/n_mypage_on.svg" },
];

export default function BottomNav({ activeId = "home" }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t border-gray-200 bg-white safe-area-pb"
      aria-label="メインナビゲーション"
    >
      {navItems.map(({ id, label, href, src, srcOn }) => {
        const isActive = activeId === id;
        const className =
          "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors active:opacity-80 min-w-[56px] " +
          (isActive ? "opacity-100" : "opacity-50");
        const icon = (
          <img
            src={isActive ? srcOn : src}
            alt=""
            className="h-6 w-6 shrink-0"
            width={24}
            height={24}
            aria-hidden
          />
        );
        if (href) {
          return (
            <Link
              key={id}
              href={href}
              className={className}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              {icon}
            </Link>
          );
        }
        return (
          <button key={id} type="button" className={className} aria-label={label}>
            {icon}
          </button>
        );
      })}
    </nav>
  );
}
