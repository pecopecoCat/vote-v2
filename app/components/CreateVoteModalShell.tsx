"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import CreateVoteFormContentWithSuspense from "../create/form/CreateVoteFormContent";
import { navigateBack } from "../lib/navigateBack";

const DESKTOP_MQ = "(min-width: 768px)";

type CreateVoteModalShellProps = {
  /** intercept: 下の画面の上に被せる / standalone: /create/form 直アクセス時のフォールバック */
  mode?: "intercept" | "standalone";
};

export default function CreateVoteModalShell({ mode = "intercept" }: CreateVoteModalShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  const isCreateFormRoute = pathname.startsWith("/create/form");
  const showModal = isCreateFormRoute && isDesktop === true;

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /** SP: インターセプト時はフルページへ（@modal ではなく /create/form を表示） */
  useEffect(() => {
    if (mode !== "intercept" || isDesktop !== false || !isCreateFormRoute) return;
    window.location.replace(window.location.href);
  }, [isDesktop, isCreateFormRoute, mode]);

  useEffect(() => {
    if (!showModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [showModal]);

  useEffect(() => {
    if (mode === "intercept" && !isCreateFormRoute) {
      document.body.style.overflow = "";
    }
  }, [isCreateFormRoute, mode]);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setEntered(false);
    document.body.style.overflow = "";
    window.setTimeout(() => {
      navigateBack(router, { fallbackHref: "/" });
    }, 220);
  }, [closing, router]);

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, showModal]);

  if (!showModal || isDesktop === null) {
    return null;
  }

  return (
    <div
      className={`create-vote-modal-root fixed inset-0 z-[70]${closing ? " pointer-events-none" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="VOTEを作成"
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
        className={`create-vote-modal-panel absolute left-1/2 top-1/2 flex max-h-[min(900px,90dvh)] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-[#F1F1F1] shadow-2xl transition-all duration-200 ${
          entered && !closing ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
        }`}
      >
        <CreateVoteFormContentWithSuspense variant="modal" onClose={close} />
      </div>
    </div>
  );
}
