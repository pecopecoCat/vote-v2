"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { getAuth, logout } from "../data/auth";

export default function SettingsPage() {
  const router = useRouter();
  const auth = getAuth();

  const handleLogout = () => {
    logout();
    router.replace("/profile");
  };

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[50px]">
      <AppHeader type="title" title="設定" backHref="/profile" />
      <main className="mx-auto max-w-lg px-[5.333vw] py-4">
        {auth.isLoggedIn ? (
          <>
            <section className="mb-6">
              <h2 className="mb-2 px-1 text-sm font-bold text-gray-900">各種設定</h2>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <Link
                  href="/settings/account"
                  className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-gray-900 hover:bg-gray-50"
                >
                  <span className="text-sm font-medium">アカウント管理</span>
                  <span className="text-gray-400" aria-hidden>
                    &gt;
                  </span>
                </Link>
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-gray-400"
                >
                  <span className="text-sm font-medium">表示設定</span>
                  <span aria-hidden>&gt;</span>
                </button>
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-gray-400"
                >
                  <span className="text-sm font-medium">VOTEの国・地域設定</span>
                  <span aria-hidden>&gt;</span>
                </button>
              </div>
              <p className="mt-2 px-1 text-xs text-red-600">
                「表示設定」「VOTEの国・地域設定」は今後のバージョンアップで対応予定となります。
              </p>
            </section>

            <section className="mb-6">
              <h2 className="mb-2 px-1 text-sm font-bold text-gray-900">このアプリについて</h2>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <Link href="#" className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-gray-900 hover:bg-gray-50">
                  <span className="text-sm font-medium">VOTEマニュアル</span>
                  <span className="text-gray-400" aria-hidden>&gt;</span>
                </Link>
                <Link href="#" className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-gray-900 hover:bg-gray-50">
                  <span className="text-sm font-medium">利用規約</span>
                  <span className="text-gray-400" aria-hidden>&gt;</span>
                </Link>
                <Link href="#" className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-gray-900 hover:bg-gray-50">
                  <span className="text-sm font-medium">プライバシーポリシー</span>
                  <span className="text-gray-400" aria-hidden>&gt;</span>
                </Link>
                <Link href="#" className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-gray-900 hover:bg-gray-50">
                  <span className="text-sm font-medium">外部送信ポリシー</span>
                  <span className="text-gray-400" aria-hidden>&gt;</span>
                </Link>
                <Link href="#" className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-gray-900 hover:bg-gray-50">
                  <span className="text-sm font-medium">特定商取引法に基づく表示</span>
                  <span className="text-gray-400" aria-hidden>&gt;</span>
                </Link>
                <Link href="#" className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-gray-900 hover:bg-gray-50">
                  <span className="text-sm font-medium">ヘルプ・よくある質問</span>
                  <span className="text-gray-400" aria-hidden>&gt;</span>
                </Link>
                <Link href="#" className="flex w-full items-center justify-between px-4 py-3 text-left text-gray-900 hover:bg-gray-50">
                  <span className="text-sm font-medium">お問い合わせ</span>
                  <span className="text-gray-400" aria-hidden>&gt;</span>
                </Link>
              </div>
            </section>

            <section className="border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ログアウト
              </button>
            </section>
          </>
        ) : (
          <p className="text-sm text-gray-500">設定画面</p>
        )}
      </main>
    </div>
  );
}
