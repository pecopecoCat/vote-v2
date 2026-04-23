"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "../../components/BottomNav";
import { getAuth, loginAsDemoUser, getLastLoggedInUserId, clearLastLoggedInUserId, getDisplayUserForDemo, fetchUserProfileFromApi, DEMO_USER_IDS, DEMO_USERS, type DemoUserId } from "../../data/auth";

const USER_MEMOS: Record<DemoUserId, string> = {
  user1: "普通",
  user2: "ママ",
  user3: "ドラマ好き",
  user4: "パパ",
  user5: "Kpop好き",
  user6: "猫好き",
  user7: "アート・クリエイティブ好き",
  user8: "映画好き",
  user9: "アイドル好き",
  user10: "オーガニック女子",
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
  /** ログイン中一覧の取得完了前は選択不可（true のときだけユーザーボタン有効） */
  const [activeListLoaded, setActiveListLoaded] = useState(false);
  /** ユーザー選択を開くためにAPI取得中か */
  const [openingUserChoice, setOpeningUserChoice] = useState(false);
  /** 連打・StrictMode 二重マウントでも fetch が重ならないようにする */
  const openChoiceInFlightRef = useRef(false);
  /** APIから取得したニックネーム（キャッシュクリア後も復元用） */
  const [profilesFromApi, setProfilesFromApi] = useState<Record<string, { name?: string; iconUrl?: string }>>({});

  useEffect(() => {
    if (getAuth().isLoggedIn) {
      router.replace(returnTo);
      return;
    }
  }, [router, returnTo]);

  /** 一覧取得→アカウント選択表示（依存配列なしで安定参照＝自動オープン時の二重 fetch を防ぐ） */
  const openUserChoice = useCallback(() => {
    if (openChoiceInFlightRef.current) return;
    openChoiceInFlightRef.current = true;
    setOpeningUserChoice(true);
    setActiveListLoaded(false);
    setShowUserChoice(false);
    let cancelled = false;
    const loadActiveAndProfiles = async () => {
      try {
        // ログアウトせずに閉じた場合、サーバーの「ログイン中」を先に解除してから一覧を取る。
        // 解除が間に合わないと、直後の再ログインが 409 になることがあるため await で直列化する。
        const lastId = getLastLoggedInUserId();
        if (lastId && DEMO_USER_IDS.includes(lastId as DemoUserId)) {
          try {
            await fetch("/api/active-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ logoutUserId: lastId }),
            });
          } finally {
            clearLastLoggedInUserId();
          }
        }
        const [activeRes, ...profileResults] = await Promise.all([
          fetch("/api/active-user").then((r) => r.json()) as Promise<{ userIds?: string[] }>,
          ...DEMO_USER_IDS.map((uid) => fetchUserProfileFromApi(uid)),
        ]);
        if (cancelled) return;
        setActiveUserIds(Array.isArray(activeRes.userIds) ? activeRes.userIds : []);
        const profiles: Record<string, { name?: string; iconUrl?: string }> = {};
        DEMO_USER_IDS.forEach((uid, i) => {
          const p = profileResults[i];
          if (p && (p.name || p.iconUrl !== undefined)) profiles[uid] = p;
        });
        setProfilesFromApi(profiles);
        setActiveListLoaded(true);
        setShowUserChoice(true);
      } catch {
        if (!cancelled) {
          setActiveListLoaded(true);
          setShowUserChoice(true);
        }
      } finally {
        if (!cancelled) {
          setOpeningUserChoice(false);
          openChoiceInFlightRef.current = false;
        }
      }
    };
    void loadActiveAndProfiles();
  }, []);

  /** プロフィールの「LINEでログイン」から来た直後に 1 回でアカウント一覧へ（ボタン二重タップ不要） */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (getAuth().isLoggedIn) return;
    openUserChoice();
  }, [openUserChoice]);

  const handleLoginAs = useCallback(
    async (userId: DemoUserId) => {
      setLoginError(null);
      setLoading(true);
      try {
        // キャッシュクリア後は lastLoggedInUserId が残らないため、サーバーに「ログイン中」が残ることがある。
        // この端末で「このユーザーでログインする」と選んだ場合は、先にサーバー側を解除してからログインする（取りこぼし解消）。
        const needTakeOver =
          activeUserIds.includes(userId) && getLastLoggedInUserId() === null;
        if (needTakeOver) {
          await fetch("/api/active-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logoutUserId: userId }),
          });
        }
        const register = () =>
          fetch("/api/active-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
        let res = await register();
        let data = (await res.json()) as { error?: string; code?: string };
        if (res.status === 409) {
          // ログアウト直後など KV の反映が遅いと同一端末でも 409 になることがあるため、一度 del して再試行する
          await fetch("/api/active-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logoutUserId: userId }),
          });
          res = await register();
          data = (await res.json()) as { error?: string; code?: string };
        }
        if (res.status === 409) {
          setLoginError(data.error ?? "このアカウントは別の端末でログイン中です。");
          return;
        }
        if (!res.ok) return;
        await loginAsDemoUser(userId);
        router.replace(returnTo);
      } finally {
        setLoading(false);
      }
    },
    [returnTo, router, activeUserIds]
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
              style={{ fontFamily: "var(--font-lato), var(--font-noto-sans-jp), sans-serif" }}
            >
              ログインしよう。
            </h2>
            <p
              className="mt-4 text-[13px] font-bold text-gray-900"
              style={{
                fontFamily: "var(--font-lato), var(--font-noto-sans-jp), sans-serif",
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
                onClick={() => openUserChoice()}
                disabled={openingUserChoice}
                className="w-full rounded-xl bg-gray-900 py-4 text-center text-base font-bold text-white hover:opacity-90 touch-manipulation disabled:opacity-70 disabled:cursor-wait"
                style={{ touchAction: "manipulation" }}
                aria-label="LINEでログインする"
              >
                {openingUserChoice ? "確認中..." : "LINEでログインする"}
              </button>
            ) : (
              <>
                {loginError && (
                  <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loginError}</p>
                )}
                <p className="mb-3 text-sm font-bold text-gray-700">どれでログインする？</p>
                <div className="grid grid-cols-5 gap-2">
                  {DEMO_USER_IDS.map((userId) => {
                    const lastId = getLastLoggedInUserId();
                    const apiProfile = profilesFromApi[userId];
                    const localProfile = getDisplayUserForDemo(userId);
                    const defaultUser = DEMO_USERS[userId];
                    const displayUser = apiProfile?.name || apiProfile?.iconUrl !== undefined
                      ? { name: apiProfile.name ?? defaultUser.name, iconUrl: apiProfile.iconUrl ?? defaultUser.iconUrl }
                      : localProfile;
                    const memo = USER_MEMOS[userId];
                    // キャッシュクリア後は lastId が無いため「どれが別端末か」判定できない → すべて選択可にしてタップで取りこぼし解除
                    const isLoggedInElsewhere =
                      activeUserIds.includes(userId) &&
                      lastId != null &&
                      lastId !== userId;
                    const disabled = loading || !activeListLoaded || isLoggedInElsewhere;
                    return (
                      <button
                        key={userId}
                        type="button"
                        onClick={() => handleLoginAs(userId)}
                        disabled={disabled}
                        className="flex flex-col items-center gap-1 rounded-xl border-2 border-gray-300 bg-white py-3 hover:border-gray-900 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white touch-manipulation"
                        style={{ touchAction: "manipulation" }}
                        aria-label={isLoggedInElsewhere ? `${displayUser.name}は別の端末でログイン中` : `${displayUser.name}でログイン`}
                      >
                        <img
                          src={displayUser.iconUrl}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                          width={40}
                          height={40}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="text-xs font-bold text-gray-900">{displayUser.name}</span>
                        {memo && (
                          <span className="text-[12px] text-gray-500">{memo}</span>
                        )}
                        {isLoggedInElsewhere && (
                          <span className="text-[10px] text-gray-500">ログイン中</span>
                        )}
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
