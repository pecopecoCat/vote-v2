/**
 * ログイン状態（LINEのみ想定）。localStorage で永続化。
 * 本番では LINE Login SDK で取得したアクセストークン・ユーザー情報と連携する想定。
 */

const STORAGE_KEY = "vote_line_auth";
const EVENT_NAME = "vote_auth_updated";
/** ユーザーごとのプロフィール（ニックネーム・アイコン）を永続化。ログアウトしても保持 */
const PROFILE_STORAGE_KEY_PREFIX = "vote_user_profile_";
/** ゲスト識別用（ログアウト＝別ユーザーとして扱うため sessionStorage で管理） */
const GUEST_ID_KEY = "vote_guest_id";

function generateGuestId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function getGuestId(): string {
  if (typeof window === "undefined") return generateGuestId();
  let id = window.sessionStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = generateGuestId();
    window.sessionStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

/** ログアウト時に呼ぶ。次のゲストを別ユーザーとして扱うため新しいIDを発行 */
export function regenerateGuestId(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(GUEST_ID_KEY, generateGuestId());
}

export interface LineAuthUser {
  name: string;
  iconUrl?: string;
}

/** デモ用ユーザーID（user1..user10） */
export const DEMO_USER_IDS = [
  "user1", "user2", "user3", "user4", "user5",
  "user6", "user7", "user8", "user9", "user10",
] as const;
export type DemoUserId = (typeof DEMO_USER_IDS)[number];

/** 簡易ログイン用：10ユーザー（user1/user2 はアイコンあり、user3..10 はデフォルトアイコン） */
export const DEMO_USERS: Record<DemoUserId, { name: string; iconUrl: string }> = {
  user1: { name: "user1", iconUrl: "/user1.png" },
  user2: { name: "user2", iconUrl: "/user2.png" },
  user3: { name: "user3", iconUrl: "/default-avatar.png" },
  user4: { name: "user4", iconUrl: "/default-avatar.png" },
  user5: { name: "user5", iconUrl: "/default-avatar.png" },
  user6: { name: "user6", iconUrl: "/default-avatar.png" },
  user7: { name: "user7", iconUrl: "/default-avatar.png" },
  user8: { name: "user8", iconUrl: "/default-avatar.png" },
  user9: { name: "user9", iconUrl: "/default-avatar.png" },
  user10: { name: "user10", iconUrl: "/default-avatar.png" },
};

export interface AuthState {
  isLoggedIn: boolean;
  user?: LineAuthUser;
  /** デモ用：どのユーザーでログインしたか（ニックネーム変更後もコレクション等の紐づけに使用） */
  userId?: DemoUserId;
}

function load(): AuthState {
  if (typeof window === "undefined") {
    return { isLoggedIn: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { isLoggedIn: false };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "isLoggedIn" in parsed) {
      const p = parsed as { isLoggedIn: boolean; user?: LineAuthUser; userId?: string };
      const uid = p.userId;
      const userId = typeof uid === "string" && DEMO_USER_IDS.includes(uid as DemoUserId) ? (uid as DemoUserId) : undefined;
      return {
        isLoggedIn: Boolean(p.isLoggedIn),
        user: p.user && typeof p.user === "object" ? p.user : undefined,
        userId,
      };
    }
  } catch {
    // ignore
  }
  return { isLoggedIn: false };
}

function save(state: AuthState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

function getProfileStorageKey(userId: DemoUserId): string {
  return PROFILE_STORAGE_KEY_PREFIX + userId;
}

function loadSavedProfile(userId: DemoUserId): Partial<LineAuthUser> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getProfileStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    const name = typeof p.name === "string" ? p.name : undefined;
    const iconUrl = typeof p.iconUrl === "string" ? p.iconUrl : undefined;
    if (!name && iconUrl === undefined) return null;
    return { ...(name ? { name } : {}), ...(iconUrl !== undefined ? { iconUrl } : {}) };
  } catch {
    return null;
  }
}

function saveProfile(userId: DemoUserId, profile: LineAuthUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getProfileStorageKey(userId), JSON.stringify(profile));
  } catch {
    // ignore
  }
}

/** 現在のログイン状態を取得 */
export function getAuth(): AuthState {
  return load();
}

/** LINEでログイン済みにする（デモ用。本番では LINE Login コールバックで user を渡す） */
export function setLineLogin(user?: LineAuthUser): void {
  save({
    isLoggedIn: true,
    user: user ?? DEMO_USERS.user1,
  });
}

/** 簡易デモ：user1..user10 のいずれかでログイン（保存済みニックネーム・アイコンがあれば復元） */
export function loginAsDemoUser(userId: DemoUserId): void {
  const defaultUser = DEMO_USERS[userId];
  const saved = loadSavedProfile(userId);
  const user: LineAuthUser = saved
    ? {
        name: saved.name ?? defaultUser.name,
        iconUrl: saved.iconUrl !== undefined ? saved.iconUrl : defaultUser.iconUrl,
      }
    : defaultUser;
  save({
    isLoggedIn: true,
    user,
    userId,
  });
}

/** ログイン中のプロフィール（ニックネーム・アイコン）を更新（user1/user2 の場合は永続化してログアウト後も保持） */
export function updateCurrentUserProfile(updates: Partial<LineAuthUser>): void {
  const state = load();
  if (!state.isLoggedIn || !state.user) return;
  const nextUser: LineAuthUser = {
    name: updates.name ?? state.user.name,
    iconUrl: updates.iconUrl !== undefined ? updates.iconUrl : state.user.iconUrl,
  };
  save({ ...state, user: nextUser });
  const userId = state.userId ?? (state.user && DEMO_USER_IDS.includes(state.user.name as DemoUserId) ? (state.user.name as DemoUserId) : null);
  if (userId) {
    saveProfile(userId, nextUser);
  }
}

/** ログアウト（次の未ログインは別ゲストとして扱うためゲストIDを再発行） */
export function logout(): void {
  regenerateGuestId();
  save({ isLoggedIn: false });
}

/**
 * 投票・コメントなどの活動データをユーザーごとに分けるためのID。
 * 未ログイン: user0 扱い（ゲストID）。ログイン: user1 / user2 で別々に保存。
 */
export function getCurrentActivityUserId(): string {
  const state = load();
  if (state.isLoggedIn) {
    if (state.userId) return state.userId;
    if (state.user && DEMO_USER_IDS.includes(state.user.name as DemoUserId)) return state.user.name;
    return "line";
  }
  return "guest_" + getGuestId();
}

/** ログイン状態変更時に発火するイベント名（useEffect で購読用） */
export function getAuthUpdatedEventName(): string {
  return EVENT_NAME;
}
