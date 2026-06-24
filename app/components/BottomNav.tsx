"use client";

import Link from "next/link";
import { MAIN_NAV_ITEMS, type NavItemId } from "./mainNav";
import { useMainNavState } from "../hooks/useMainNavState";

const DEFAULT_AVATAR = "/default-avatar.png";

export type { NavItemId };

export interface BottomNavProps {
  activeId?: NavItemId;
}

export default function BottomNav({ activeId = "home" }: BottomNavProps) {
  const { userIconUrl, isLoggedIn, announcementUnread } = useMainNavState();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex w-full items-stretch justify-around border-t border-gray-200 bg-white px-1 safe-area-pb md:hidden"
      aria-label="メインナビゲーション"
    >
      {MAIN_NAV_ITEMS.map(({ id, label, href, src, srcOn }) => {
        const isActive = activeId === id;
        const className =
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 py-2 transition-colors active:opacity-80";
        const showUserIcon = id === "profile" && userIconUrl;
        const profilePx = 26;
        const iconPx = id === "profile" ? profilePx : 22;
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
            return isActive && isLoggedIn ? (
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
            return isActive && isLoggedIn ? (
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
        const labelEl = (
          <span className="max-w-full truncate text-[9px] leading-none text-[#191919]">{label}</span>
        );
        if (href) {
          const wrapIcon =
            id === "notifications" && announcementUnread ? (
              <span className="relative inline-flex shrink-0">
                {icon}
                <span
                  className="pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#E63E48] ring-2 ring-white"
                  aria-hidden
                />
              </span>
            ) : (
              icon
            );
          return (
            <Link
              key={id}
              href={href}
              prefetch={id !== "add"}
              className={className}
              aria-label={
                id === "notifications" && announcementUnread ? `${label}（未読のお知らせがあります）` : label
              }
              aria-current={isActive ? "page" : undefined}
            >
              {wrapIcon}
              {labelEl}
            </Link>
          );
        }
        return (
          <button key={id} type="button" className={className} aria-label={label}>
            {icon}
            {labelEl}
          </button>
        );
      })}
    </nav>
  );
}
