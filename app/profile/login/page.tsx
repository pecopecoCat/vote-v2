"use client";

import Link from "next/link";
import BottomNav from "../../components/BottomNav";

/** ログイン画面（とっておき用）。通常のマイページは /profile */
export default function ProfileLoginPage() {
  return (
    <div className="min-h-screen bg-[#FFE100] pb-20">
      <header className="flex justify-end px-[5.333vw] pt-4">
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center text-gray-900"
          aria-label="設定"
        >
          <img src="/icons/icon_setting.svg" alt="" className="h-6 w-6" width={20} height={20} />
        </Link>
      </header>

      <main className="mx-auto flex max-w-lg flex-col items-center px-[5.333vw] pt-8 text-center">
        <div className="flex justify-center" style={{ transform: "scale(1.61)" }}>
          <img src="/logo.svg" alt="VOTE" className="h-16 w-auto" width={177} height={77} />
        </div>

        <div className="mt-[40px] w-full max-w-md">
          <h2 className="text-[22px] font-bold text-gray-900">ログインしよう</h2>
          <p
            className="mt-4 text-base font-bold text-gray-900"
            style={{ letterSpacing: "1px", lineHeight: 1.95 }}
          >
            VOTEにログインすると、
            <br />
            みんなに質問したり、
            <br />
            みんなから意見がもらえたり…
            <br />
            <br />
            疑問に感じていたことも
            <br />
            すぐに解決できるかも！
          </p>
        </div>

        <div className="mt-12 w-full max-w-md">
          <button
            type="button"
            className="w-full rounded-xl bg-gray-900 py-4 text-center text-base font-bold text-white"
            aria-label="LINEでログインする"
          >
            LINEでログインする
          </button>
        </div>
      </main>

      <BottomNav activeId="profile" />
    </div>
  );
}
