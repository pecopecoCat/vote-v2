"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchPanelWithSuspense } from "./SearchPanel";

type SearchOverlayShellProps = {
  /** intercept: 下の画面の上に被せる / standalone: /search 直アクセス */
  mode?: "intercept" | "standalone";
};

export default function SearchOverlayShell({ mode = "intercept" }: SearchOverlayShellProps) {
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, []);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setEntered(false);
    window.setTimeout(() => {
      if (mode === "intercept") {
        router.back();
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

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden"
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
