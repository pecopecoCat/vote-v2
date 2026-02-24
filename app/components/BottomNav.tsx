"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAuth, getAuthUpdatedEventName } from "../data/auth";

const DEFAULT_AVATAR = "/default-avatar.png";

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
  const [userIconUrl, setUserIconUrl] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const auth = getAuth();
      setUserIconUrl(auth.isLoggedIn && auth.user?.iconUrl ? auth.user.iconUrl : null);
    };
    update();
    window.addEventListener(getAuthUpdatedEventName(), update);
    return () => window.removeEventListener(getAuthUpdatedEventName(), update);
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t border-gray-200 bg-white safe-area-pb"
      aria-label="メインナビゲーション"
    >
      {navItems.map(({ id, label, href, src, srcOn }) => {
        const isActive = activeId === id;
        const className =
          "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors active:opacity-80 min-w-[56px]";
        const showUserIcon = id === "profile" && userIconUrl;
        const icon = showUserIcon ? (
          <span
            className={`block h-[22px] w-[22px] shrink-0 overflow-hidden rounded-full ${isActive ? "ring-2 ring-[#191919]" : ""}`}
          >
            <img
              src={userIconUrl}
              alt=""
              className="h-full w-full object-cover"
              width={22}
              height={22}
              aria-hidden
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
          </span>
        ) : (
          <img
            src={isActive ? srcOn : src}
            alt=""
            className="h-[22px] w-[22px] shrink-0"
            width={22}
            height={22}
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
