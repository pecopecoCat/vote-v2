export const APP_TOAST_EVENT = "vote_app_toast";

export type AppToastDetail = { message: string };

export function showAppToast(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AppToastDetail>(APP_TOAST_EVENT, { detail: { message } })
  );
}
