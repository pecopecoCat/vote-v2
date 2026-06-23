"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import BottomNav, { type NavItemId } from "./BottomNav";

function navActiveIdFromPath(pathname: string): NavItemId {
  if (pathname === "/collections" || pathname.startsWith("/collection/")) return "collection";
  if (pathname.startsWith("/create") || pathname.startsWith("/drafts")) return "add";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}

function AppBottomNavInner() {
  const pathname = usePathname();
  return <BottomNav activeId={navActiveIdFromPath(pathname)} />;
}

/** 全画面で1インスタンスの下部ナビ（Link prefetch を維持し、ページ遷移ごとの再 prefetch を防ぐ） */
export default function AppBottomNav() {
  return (
    <Suspense fallback={<BottomNav />}>
      <AppBottomNavInner />
    </Suspense>
  );
}
