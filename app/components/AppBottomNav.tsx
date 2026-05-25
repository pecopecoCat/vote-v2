"use client";

import { usePathname } from "next/navigation";
import BottomNav, { type NavItemId } from "./BottomNav";

function navActiveIdFromPath(pathname: string): NavItemId {
  if (pathname.startsWith("/search") || pathname.startsWith("/collection")) return "search";
  if (pathname.startsWith("/create") || pathname.startsWith("/drafts")) return "add";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}

/** 全画面で1インスタンスの下部ナビ（Link prefetch を維持し、ページ遷移ごとの再 prefetch を防ぐ） */
export default function AppBottomNav() {
  const pathname = usePathname();
  return <BottomNav activeId={navActiveIdFromPath(pathname)} />;
}
