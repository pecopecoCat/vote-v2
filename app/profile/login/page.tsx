"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "../../components/BottomNav";
import { getAuth, loginAsDemoUser, DEMO_USERS } from "../../data/auth";

function ProfileLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/profile";
  const [showUserChoice, setShowUserChoice] = useState(false);

  useEffect(() => {
    if (getAuth().isLoggedIn) {
      router.replace(returnTo);
    }
  }, [router, returnTo]);

  const handleLoginAs = (userId: "user1" | "user2") => {
    loginAsDemoUser(userId);
    router.replace(returnTo);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFE100] pb-20">
      <header className="flex shrink-0 justify-end px-[5.333vw] pt-4">
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center text-gray-900"
          aria-label="設定"
        >
          <img src="/icons/icon_setting.svg" alt="" className="h-6 w-6" width={20} height={20} />
        </Link>
      </header>

      <main className="mx-auto flex min-h-0 flex-1 flex-col items-center justify-center px-[5.333vw] text-center">
        <div className="flex w-full max-w-md flex-col items-center">
          <div className="flex justify-center" style={{ transform: "scale(1.61)" }}>
            <img src="/logo.svg" alt="VOTE" className="h-16 w-auto" width={177} height={77} />
          </div>

          <div className="mt-[40px] w-full">
            <h2
              className="text-[16px] font-black text-gray-900"
              style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
            >
              ログインしよう。
            </h2>
            <p
              className="mt-4 text-[13px] font-bold text-gray-900"
              style={{
                fontFamily: "var(--font-noto-sans-jp), sans-serif",
                letterSpacing: "1px",
                lineHeight: 1.66,
              }}
            >
              VOTEにログインすると、
              <br />
              みんなに質問したり、
              <br />
              みんなから意見がもらえたり.......
              <br />
              <br />
              長い間疑問に感じていたことも、
              <br />
              ですぐに解決できるかも！
            </p>
          </div>

          <div className="mt-[30px] w-full">
            {!showUserChoice ? (
              <button
                type="button"
                onClick={() => setShowUserChoice(true)}
                className="w-full rounded-xl bg-gray-900 py-4 text-center text-base font-bold text-white hover:opacity-90"
                aria-label="LINEでログインする"
              >
                LINEでログインする
              </button>
            ) : (
              <div className="flex w-full flex-col gap-3">
                <p className="text-sm font-bold text-gray-700">どちらでログインする？</p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleLoginAs("user1")}
                    className="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-pink-400 bg-pink-50 py-4 hover:bg-pink-100 active:bg-pink-100"
                    aria-label="user1（ピンク）でログイン"
                  >
                    <img src={DEMO_USERS.user1.iconUrl} alt="" className="h-14 w-14 rounded-full object-cover" width={56} height={56} />
                    <span className="text-sm font-bold text-gray-900">user1</span>
                    <span className="text-xs text-pink-600">ピンク</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoginAs("user2")}
                    className="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-blue-400 bg-blue-50 py-4 hover:bg-blue-100 active:bg-blue-100"
                    aria-label="user2（ブルー）でログイン"
                  >
                    <img src={DEMO_USERS.user2.iconUrl} alt="" className="h-14 w-14 rounded-full object-cover" width={56} height={56} />
                    <span className="text-sm font-bold text-gray-900">user2</span>
                    <span className="text-xs text-blue-600">ブルー</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav activeId="profile" />
    </div>
  );
}

/** ログイン専用URL。useSearchParams を Suspense でラップ。 */
export default function ProfileLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#FFE100]">読み込み中...</div>}>
      <ProfileLoginContent />
    </Suspense>
  );
}
