import type { ReactNode } from "react";

/**
 * lg 以上: 画面全体を使わず中央にスマホ幅のカラム＋右側に案内（参考デスクトップレイアウト）。
 * 子の `position: fixed` に `transform` を付けない（付けるとスクロール時に下部ナビがカラムごと流れて見えなくなるため）。
 */
export default function DesktopViewportChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-[var(--color-bg)] lg:flex lg:min-h-dvh lg:items-start lg:justify-center lg:gap-12 lg:bg-[#E4E4E4] lg:px-8 lg:py-10">
      <div className="relative w-full min-h-dvh lg:min-h-[calc(100dvh-5rem)] lg:w-[430px] lg:max-w-[430px] lg:shrink-0 lg:rounded-[28px] lg:bg-[var(--color-bg)] lg:shadow-[0_12px_48px_rgba(0,0,0,0.14)] lg:ring-1 lg:ring-black/[0.07]">
        {children}
      </div>
      <aside
        className="hidden w-[240px] shrink-0 pt-4 text-center lg:block"
        aria-label="デスクトップ表示の案内"
      >
        <img src="/logo.svg" alt="VOTE" className="mx-auto h-auto w-[min(100%,200px)]" width={177} height={77} />
        <p className="mt-3 text-[15px] font-semibold tracking-wide text-neutral-700">
          Create my VOTE
        </p>
        <p className="mt-8 text-left text-xs leading-relaxed text-neutral-600">
          PC では画面中央のスマホ幅で表示しています。実機と同じ操作感でお試しください。
        </p>
        <p className="mt-10 text-[11px] text-neutral-400">© VOTE</p>
      </aside>
    </div>
  );
}
