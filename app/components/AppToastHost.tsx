"use client";

import { useEffect, useState } from "react";
import { APP_TOAST_EVENT, type AppToastDetail, type AppToastKind } from "../lib/appToast";

const TOAST_MS = 2000;

function ToastVoteIcon({ className }: { className?: string }) {
  return (
    <img
      src="/icons/white_vote.svg"
      alt=""
      className={className}
      width={18}
      height={18}
      decoding="async"
    />
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
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex justify-center">
      <div
        className="app-toast-bar box-border flex items-center justify-center gap-2 rounded-[10px] bg-[#191919] px-4 py-3.5 text-[14px] font-bold leading-snug text-white shadow-[0_2px_10px_rgba(0,0,0,0.16)]"
        role="status"
      >
        {kind === "success" ? <ToastVoteIcon className="h-[18px] w-[18px] shrink-0" /> : null}
        <span className="min-w-0 text-center font-bold">{message}</span>
      </div>
    </div>
  );
}
