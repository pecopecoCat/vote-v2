import {
  DEMO_USER_IDS,
  DEMO_USERS,
  getAuth,
  getDisplayUserForDemo,
  type DemoUserId,
} from "../data/auth";
import type { VoteComment } from "../data/voteCardActivity";

const MY_COMMENT_USER_NAME = "自分";
const DEFAULT_AVATAR = "/default-avatar.png";

export type CommentUserDisplay = {
  name: string;
  iconUrl: string;
};

function isDemoUserId(id: string): id is DemoUserId {
  return (DEMO_USER_IDS as readonly string[]).includes(id);
}

/** コメントに紐づくデモ userId を解決（userId 優先、なければ保存名から推定） */
function resolveDemoUserIdFromComment(comment: VoteComment): DemoUserId | undefined {
  if (comment.userId && isDemoUserId(comment.userId)) {
    return comment.userId;
  }
  const storedName = comment.user?.name?.trim();
  if (!storedName) return undefined;
  for (const uid of DEMO_USER_IDS) {
    const display = getDisplayUserForDemo(uid);
    const defaultName = DEMO_USERS[uid].name;
    if (storedName === display.name || storedName === defaultName) {
      return uid;
    }
  }
  return undefined;
}

/** コメント表示用のユーザー名・アイコン（プロフィールの最新値を反映） */
export function resolveCommentUserDisplay(comment: VoteComment): CommentUserDisplay {
  const demoUserId = resolveDemoUserIdFromComment(comment);
  if (demoUserId) {
    return getDisplayUserForDemo(demoUserId);
  }

  const auth = getAuth();
  const storedName = comment.user?.name;
  if (auth.isLoggedIn && auth.user) {
    if (storedName === MY_COMMENT_USER_NAME || storedName === auth.user.name) {
      return {
        name: auth.user.name,
        iconUrl: auth.user.iconUrl ?? DEFAULT_AVATAR,
      };
    }
  }

  return {
    name: storedName?.trim() || "ユーザー",
    iconUrl: comment.user?.iconUrl ?? DEFAULT_AVATAR,
  };
}
