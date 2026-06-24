"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import SideNav from "./SideNav";
import { navActiveIdFromPath } from "./mainNav";

function AppMainNavInner() {
  const pathname = usePathname();
  const activeId = navActiveIdFromPath(pathname);
  return (
    <>
      <SideNav activeId={activeId} />
      <BottomNav activeId={activeId} />
    </>
  );
}

/** 全画面で1インスタンスのメインナビ（SP: 下部 / PC: 左サイド） */
export default function AppMainNav() {
  return (
    <Suspense fallback={<BottomNav />}>
      <AppMainNavInner />
    </Suspense>
  );
}
