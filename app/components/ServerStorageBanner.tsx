"use client";

import { useSharedData } from "../context/SharedDataContext";

export default function ServerStorageBanner() {
  const { storageMode } = useSharedData();

  if (storageMode !== "local-only") return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 border-b border-amber-300/80 bg-amber-50 px-4 py-2.5 text-center text-[13px] leading-snug text-amber-950"
    >
      <strong className="font-bold">サーバーストレージ未設定</strong>
      <span className="mx-1.5">—</span>
      データはこの端末のみに保存されています。本番で全員に共有するには Vercel の Redis（Upstash）を設定し、
      <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-[12px]">KV_REST_API_URL</code>
      と
      <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-[12px]">KV_REST_API_TOKEN</code>
      を環境変数に追加してください。
    </div>
  );
}
