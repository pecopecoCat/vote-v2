"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "../../components/BottomNav";
import { getAuth, loginAsDemoUser, DEMO_USERS, DEMO_USER_IDS, type DemoUserId } from "../../data/auth";

const USER_LABELS: Record<DemoUserId, string> = {
  user1: "ピンク",
  user2: "ブルー",
  user3: "3",
  user4: "4",
  user5: "5",
  user6: "6",
  user7: "7",
  user8: "8",
  user9: "9",
  user10: "10",
};

function ProfileLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/profile";
  const [showUserChoice, setShowUserChoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  /** 別端末でログイン中＝重複ログインさせないため選択不可にするID一覧 */
  const [activeUserIds, setActiveUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (getAuth().isLoggedIn) {
      router.replace(returnTo);
    }
  }, [router, returnTo]);

  /** ユーザー選択を開いたときにログイン中一覧を取得 */
  useEffect(() => {
    if (!showUserChoice) return;
    let cancelled = false;
    fetch("/api/active-user")
      .then((res) => res.json())
      .then((data: { userIds?: string[] }) => {
        if (!cancelled && Array.isArray(data.userIds)) setActiveUserIds(data.userIds);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [showUserChoice]);

  const handleLoginAs = useCallback(
    async (userId: DemoUserId) => {
      setLoginError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/active-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = (await res.json()) as { error?: string; code?: string };
        if (res.status === 409) {
          setLoginError(data.error ?? "このアカウントは別の端末でログイン中です。");
          return;
        }
        if (!res.ok) return;
        loginAsDemoUser(userId);
        router.replace(returnTo);
      } finally {
        setLoading(false);
      }
    },
    [returnTo, router]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FFE100] pb-[50px]">
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
              <>
                {loginError && (
                  <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loginError}</p>
                )}
                <p className="mb-3 text-sm font-bold text-gray-700">どれでログインする？</p>
                <div className="grid grid-cols-5 gap-2">
                  {DEMO_USER_IDS.map((userId) => {
                    const isLoggedInElsewhere = activeUserIds.includes(userId);
                    const disabled = loading || isLoggedInElsewhere;
                    return (
                      <button
                        key={userId}
                        type="button"
                        onClick={() => handleLoginAs(userId)}
                        disabled={disabled}
                        className="flex flex-col items-center gap-1 rounded-xl border-2 border-gray-300 bg-white py-3 hover:border-gray-900 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white"
                        aria-label={isLoggedInElsewhere ? `${DEMO_USERS[userId].name}は別の端末でログイン中` : `${DEMO_USERS[userId].name}でログイン`}
                      >
                        <img
                          src={DEMO_USERS[userId].iconUrl}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                          width={40}
                          height={40}
                        />
                        <span className="text-xs font-bold text-gray-900">{DEMO_USERS[userId].name}</span>
                        <span className="text-[10px] text-gray-500">
                          {isLoggedInElsewhere ? "ログイン中" : USER_LABELS[userId]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
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
