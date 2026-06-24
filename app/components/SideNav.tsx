"use client";

import Link from "next/link";
import { MAIN_NAV_ITEMS, type NavItemId } from "./mainNav";
import { useMainNavState } from "../hooks/useMainNavState";

const DEFAULT_AVATAR = "/default-avatar.png";

export interface SideNavProps {
  activeId?: NavItemId;
}

export default function SideNav({ activeId = "home" }: SideNavProps) {
  const { userIconUrl, isLoggedIn, announcementUnread } = useMainNavState();

  return (
    <aside className="app-side-nav hidden md:flex">
      <nav className="app-side-nav__panel" aria-label="メインナビゲーション">
        <ul className="flex flex-col gap-1">
          {MAIN_NAV_ITEMS.map(({ id, label, href, src, srcOn }) => {
            const isActive = activeId === id;
            const itemClassName = `flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
              isActive ? "bg-[#F5F5F5]" : "hover:bg-[#FAFAFA]"
            }`;

            const profilePx = 24;
            const iconPx = id === "profile" ? profilePx : 22;
            const profileActiveRing = "ring-2 ring-[#191919] ring-offset-0";

            const icon = (() => {
              if (id === "profile" && userIconUrl) {
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

            const iconWrap =
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

            if (!href) {
              return (
                <li key={id}>
                  <button type="button" className={`${itemClassName} w-full text-left`} aria-label={label}>
                    {iconWrap}
                    <span className="truncate text-sm font-bold text-[#191919]">{label}</span>
                  </button>
                </li>
              );
            }

            return (
              <li key={id}>
                <Link
                  href={href}
                  prefetch={id !== "add"}
                  className={itemClassName}
                  aria-label={
                    id === "notifications" && announcementUnread ? `${label}（未読のお知らせがあります）` : label
                  }
                  aria-current={isActive ? "page" : undefined}
                >
                  {iconWrap}
                  <span className="truncate text-sm font-bold text-[#191919]">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
