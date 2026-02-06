"use client";

import Link from "next/link";
import AppHeader from "../components/AppHeader";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-white pb-20">
      <AppHeader type="title" title="設定" backHref="/profile" />
      <main className="mx-auto max-w-lg px-[5.333vw] py-4">
        <p className="text-sm text-gray-500">設定画面（未実装）</p>
      </main>
    </div>
  );
}
