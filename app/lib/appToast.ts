export const APP_TOAST_EVENT = "vote_app_toast";

/** VOTE作成直後に HOME 新着で一度だけトーストするための sessionStorage キー */
export const PENDING_VOTE_CREATED_TOAST_KEY = "vote_app_pending_created_toast";

export type AppToastKind = "success" | "error";

export type AppToastDetail = { message: string; kind?: AppToastKind };

/** kind 省略時は success（黄トースト＋チェック） */
export function showAppToast(message: string, kind?: AppToastKind): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AppToastDetail>(APP_TOAST_EVENT, {
      detail: { message, kind: kind ?? "success" },
    })
  );
}
