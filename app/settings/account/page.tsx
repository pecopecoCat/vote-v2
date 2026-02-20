"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "../../components/AppHeader";
import { getAuth, updateCurrentUserProfile, getAuthUpdatedEventName } from "../../data/auth";

const ICON_OPTIONS = [
  { value: "/chara1.png", label: "chara1" },
  { value: "/chara2.png", label: "chara2" },
  { value: "/default-avatar.png", label: "デフォルト" },
] as const;

export default function AccountSettingsPage() {
  const router = useRouter();
  const auth = getAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");

  useEffect(() => {
    if (auth.user) {
      setName(auth.user.name);
      setIconUrl(auth.user.iconUrl ?? "/default-avatar.png");
    }
  }, [auth.user?.name, auth.user?.iconUrl]);

  useEffect(() => {
    const handler = () => {
      const a = getAuth();
      if (a.user) {
        setName(a.user.name);
        setIconUrl(a.user.iconUrl ?? "/default-avatar.png");
      }
    };
    window.addEventListener(getAuthUpdatedEventName(), handler);
    return () => window.removeEventListener(getAuthUpdatedEventName(), handler);
  }, []);

  const handleSave = () => {
    updateCurrentUserProfile({ name: name.trim() || auth.user?.name, iconUrl: iconUrl || undefined });
    router.push("/settings");
  };

  const handleCancel = () => {
    router.push("/settings");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setIconUrl(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (!auth.isLoggedIn || !auth.user) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <AppHeader type="title" title="アカウント設定" backHref="/settings" />
        <main className="mx-auto max-w-lg px-[5.333vw] py-8">
          <p className="text-sm text-gray-500">ログインするとアカウント設定ができます。</p>
          <Link href="/profile/login" className="mt-4 inline-block text-sm font-medium text-[#FFE100] underline">
            ログインする
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <AppHeader type="title" title="アカウント設定" backHref="/settings" />
      <main className="mx-auto max-w-lg px-[5.333vw] py-6">
        {/* アイコン（写真アップロード・VOTE作成画面と同じカメラアイコン） */}
        <div className="flex flex-col items-center pb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="プロフィール写真を選択"
            onChange={handlePhotoUpload}
          />
          <div className="relative shrink-0 rounded-full shadow-md">
            <span className="flex h-24 w-24 overflow-hidden rounded-full bg-gray-200">
              <img
                src={iconUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/default-avatar.png";
                }}
              />
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#191919] text-white hover:opacity-90"
              aria-label="写真をアップロード"
            >
              <span
                className="block h-5 w-5 shrink-0"
                style={{
                  backgroundColor: "#ffffff",
                  mask: "url(/icons/icon_camera.svg) no-repeat center/contain",
                  WebkitMask: "url(/icons/icon_camera.svg) no-repeat center/contain",
                }}
              />
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">プリセットから選ぶ</p>
          <div className="mt-1.5 flex gap-3">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIconUrl(opt.value)}
                className={`h-12 w-12 overflow-hidden rounded-full border-2 ${
                  iconUrl === opt.value ? "border-[#FFE100]" : "border-gray-200"
                }`}
              >
                <img src={opt.value} alt={opt.label} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* ニックネーム */}
        <div className="mb-4">
          <label htmlFor="account-nickname" className="mb-1.5 block text-sm font-bold text-gray-900">
            ニックネーム
          </label>
          <input
            id="account-nickname"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ニックネーム"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FFE100] focus:outline-none focus:ring-1 focus:ring-[#FFE100]"
          />
          <p className="mt-1.5 text-xs text-gray-500">VOTEで表示されるニックネームを設定しよう。</p>
        </div>

        <p className="mb-8 text-xs text-gray-500 leading-relaxed">
          この情報は、VOTEがユーザーに表示するコンテンツを改善したり、維持するために役立ちます。ユーザーの情報は保護されます。
        </p>

        {/* キャンセル・保存 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-100 py-3.5 text-center text-sm font-bold text-gray-700 hover:bg-gray-200"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-[#FFE100] py-3.5 text-center text-sm font-bold text-gray-900 hover:opacity-90"
          >
            保存
          </button>
        </div>
      </main>
    </div>
  );
}
