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

  /** 375px 幅を基準に 355px（比率 355/375）でビューポートに比例 */
  const toastStyle = {
    width: "calc(100vw * 355 / 375)",
    borderRadius: 10,
    color: "#ffffff",
    backgroundColor: "#191919",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
  } as const;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex justify-center"
      role="status"
    >
      <div
        className="box-border px-4 py-3 text-center text-sm font-medium"
        style={toastStyle}
      >
        {message}
      </div>
    </div>
  );
}
