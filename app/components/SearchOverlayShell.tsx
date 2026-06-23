"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navigateBack } from "../lib/navigateBack";
import { SearchPanelWithSuspense } from "./SearchPanel";

type SearchOverlayShellProps = {
  /** intercept: 下の画面の上に被せる / standalone: /search 直アクセス */
  mode?: "intercept" | "standalone";
};

export default function SearchOverlayShell({ mode = "intercept" }: SearchOverlayShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const isInterceptActive = mode === "intercept" && pathname.startsWith("/search");

  useEffect(() => {
    if (!isInterceptActive && mode === "intercept") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [isInterceptActive, mode]);

  useEffect(() => {
    if (mode === "intercept" && !pathname.startsWith("/search")) {
      document.body.style.overflow = "";
    }
  }, [pathname, mode]);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setEntered(false);
    document.body.style.overflow = "";
    window.setTimeout(() => {
      if (mode === "intercept") {
        navigateBack(router, { fallbackHref: "/" });
      } else {
        router.push("/");
      }
    }, 300);
  }, [closing, mode, router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  /** ブラウザ戻る等で URL が /search 以外になったら即非表示（透明レイヤーで操作不能になるのを防ぐ） */
  if (mode === "intercept" && !pathname.startsWith("/search")) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[60] overflow-hidden${closing ? " pointer-events-none" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="検索"
    >
      <div
        className={`search-overlay-panel flex h-full w-full flex-col bg-white transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
          entered && !closing ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <SearchPanelWithSuspense presentation="overlay" onClose={close} />
      </div>
    </div>
  );
}
