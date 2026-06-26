"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /** 開閉アニメ・body スクロールロック（ルート遷移で状態をリセット） */
  useEffect(() => {
    if (mode === "intercept" && !isSearchRoute) {
      setClosing(false);
      setEntered(false);
      document.body.style.overflow = "";
      return;
    }

    setClosing(false);
    setEntered(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [isSearchRoute, mode]);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setEntered(false);
    document.body.style.overflow = "";
    const duration = isDesktop ? 220 : 300;
    window.setTimeout(() => {
      if (mode === "intercept") {
        // replaceState 併用時は back() だけでは URL / Next の @modal が残ることがある
        router.replace("/", { scroll: false });
      } else {
        router.push("/");
      }
    }, duration);
  }, [closing, isDesktop, mode, router]);

  const inert = closing;
  const overlayInertClass = inert ? " pointer-events-none [&_*]:pointer-events-none" : "";

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
        className={`fixed inset-0 z-[60]${overlayInertClass}`}
        role="dialog"
        aria-modal="true"
        aria-label="検索"
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            entered && !closing ? "opacity-100" : "opacity-0 pointer-events-none"
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
      className={`fixed inset-0 z-[60] overflow-hidden${overlayInertClass}`}
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
