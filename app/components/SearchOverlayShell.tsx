"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navigateBack } from "../lib/navigateBack";
import { SearchPanelWithSuspense } from "./SearchPanel";

const DESKTOP_MQ = "(min-width: 768px)";

type SearchOverlayShellProps = {
  /** intercept: 下の画面の上に被せる / standalone: /search 直アクセス */
  mode?: "intercept" | "standalone";
};

export default function SearchOverlayShell({ mode = "intercept" }: SearchOverlayShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(DESKTOP_MQ).matches : false
  );
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  const isSearchRoute = pathname.startsWith("/search");
  const isInterceptActive = mode === "intercept" && isSearchRoute;

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (mode === "intercept" && !isSearchRoute) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [isInterceptActive, isSearchRoute, mode]);

  useEffect(() => {
    if (mode === "intercept" && !isSearchRoute) {
      document.body.style.overflow = "";
    }
  }, [isSearchRoute, mode]);

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
    }, isDesktop ? 220 : 300);
  }, [closing, isDesktop, mode, router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  if (mode === "intercept" && !isSearchRoute) {
    return null;
  }

  const panelProps = {
    presentation: "overlay" as const,
    layout: (isDesktop ? "modal" : "default") as "modal" | "default",
    onClose: close,
  };

  if (isDesktop) {
    return (
      <div
        className={`fixed inset-0 z-[60]${closing ? " pointer-events-none" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="検索"
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            entered && !closing ? "opacity-100" : "opacity-0"
          }`}
          aria-label="閉じる"
          onClick={close}
        />
        <div
          className={`absolute left-1/2 top-1/2 flex h-[min(900px,90dvh)] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-[transform,opacity] duration-200 ${
            entered && !closing ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
          }`}
        >
          <SearchPanelWithSuspense {...panelProps} />
        </div>
      </div>
    );
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
        <SearchPanelWithSuspense {...panelProps} />
      </div>
    </div>
  );
}
