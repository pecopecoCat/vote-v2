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
      className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex h-14 w-full max-w-[430px] items-center justify-around border-t border-gray-200 bg-white safe-area-pb"
      aria-label="メインナビゲーション"
    >
      {navItems.map(({ id, label, href, src, srcOn }) => {
        const isActive = activeId === id;
        const className =
          "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors active:opacity-80 min-w-[56px]";
        const showUserIcon = id === "profile" && userIconUrl;
        /** プロフィールは円形クリップで実寸より小さく見えるため、他タブより一回り大きくして視覚的に揃える */
        const profilePx = 26;
        const iconPx = id === "profile" ? profilePx : 22;
        /** マイページ選択時: #191919 の 2px 縁（ring は内側クリップと分離して描画） */
        const profileActiveRing = "ring-2 ring-[#191919] ring-offset-0";

        const icon = (() => {
          if (showUserIcon) {
            const avatar = (
              <span
                className="block shrink-0 overflow-hidden rounded-full"
                style={{ width: profilePx, height: profilePx }}
              >
                <img
                  src={userIconUrl}
                  alt=""
                  className="h-full w-full scale-[1.08] object-cover"
                  width={profilePx}
                  height={profilePx}
                  aria-hidden
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                  }}
                />
              </span>
            );
            return isActive ? (
              <span className={`inline-flex shrink-0 rounded-full ${profileActiveRing}`}>{avatar}</span>
            ) : (
              avatar
            );
          }
          if (id === "profile") {
            const mypageImg = (
              <img
                src={isActive ? srcOn : src}
                alt=""
                className="h-[26px] w-[26px] shrink-0"
                width={iconPx}
                height={iconPx}
                aria-hidden
              />
            );
            return isActive ? (
              <span className={`inline-flex shrink-0 rounded-full ${profileActiveRing}`}>{mypageImg}</span>
            ) : (
              mypageImg
            );
          }
          return (
            <img
              src={isActive ? srcOn : src}
              alt=""
              className="h-[22px] w-[22px] shrink-0"
              width={iconPx}
              height={iconPx}
              aria-hidden
            />
          );
        })();
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
