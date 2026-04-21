"use client";

import { useEffect, useState } from "react";
import { APP_TOAST_EVENT, type AppToastDetail, type AppToastKind } from "../lib/appToast";

const TOAST_MS = 2000;

function ToastCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AppToastHost() {
  const [toast, setToast] = useState<{ message: string; kind: AppToastKind } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<AppToastDetail>;
      const msg = ce.detail?.message;
      if (typeof msg !== "string" || !msg) return;
      const kind: AppToastKind = ce.detail?.kind === "error" ? "error" : "success";
      setToast({ message: msg, kind });
    };
    window.addEventListener(APP_TOAST_EVENT, handler);
    return () => window.removeEventListener(APP_TOAST_EVENT, handler);
  }, []);

  useEffect(() => {
    if (toast == null) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (toast == null) return null;

  const { message, kind } = toast;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex justify-center px-[10px]">
      <div
        className="box-border flex w-[min(355px,calc(100vw*355/375))] items-center justify-center gap-2 rounded-[10px] bg-[#FFE100] px-4 py-3.5 text-[14px] font-medium leading-snug text-black shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
        role="status"
      >
        {kind === "success" ? <ToastCheckIcon className="shrink-0 text-black" /> : null}
        <span className="min-w-0 text-center">{message}</span>
      </div>
    </div>
  );
}
