/** 下部ナビ・左サイドナビで共通のメニュー定義 */
export type NavItemId = "home" | "collection" | "add" | "notifications" | "profile";

export type MainNavItem = {
  id: NavItemId;
  label: string;
  href?: string;
  src: string;
  srcOn: string;
};

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  { id: "home", label: "ホーム", href: "/", src: "/icons/n_home.svg", srcOn: "/icons/n_home_on.svg" },
  {
    id: "collection",
    label: "コレクション",
    href: "/collections",
    src: "/icons/icon_collection.svg",
    srcOn: "/icons/n_collection_on.svg",
  },
  { id: "add", label: "作成", href: "/create/form", src: "/icons/n_vote.svg", srcOn: "/icons/n_vote_on.svg" },
  {
    id: "notifications",
    label: "お知らせ",
    href: "/notifications",
    src: "/icons/n_news.svg",
    srcOn: "/icons/n_news_on.svg",
  },
  { id: "profile", label: "マイページ", href: "/profile", src: "/icons/n_mypage.svg", srcOn: "/icons/n_mypage_on.svg" },
];

export function navActiveIdFromPath(pathname: string): NavItemId {
  if (pathname === "/collections" || pathname.startsWith("/collection/")) return "collection";
  if (pathname.startsWith("/create") || pathname.startsWith("/drafts")) return "add";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}
