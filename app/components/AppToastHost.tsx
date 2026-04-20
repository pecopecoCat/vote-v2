"use client";

import { useEffect, useState } from "react";
import { APP_TOAST_EVENT, type AppToastDetail } from "../lib/appToast";

const TOAST_MS = 2000;

export default function AppToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<AppToastDetail>;
      const msg = ce.detail?.message;
      if (typeof msg !== "string" || !msg) return;
      setMessage(msg);
    };
    window.addEventListener(APP_TOAST_EVENT, handler);
    return () => window.removeEventListener(APP_TOAST_EVENT, handler);
  }, []);

  useEffect(() => {
    if (message == null) return;
    const t = window.setTimeout(() => setMessage(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [message]);

  if (message == null) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex justify-center px-4"
      role="status"
    >
      <div
        className="box-border w-full max-w-[355px] rounded-[10px] bg-[#191919] px-4 py-3 text-center text-sm font-medium text-white shadow-[0_4px_10px_rgba(0,0,0,0.1)]"
      >
        {message}
      </div>
    </div>
  );
}
