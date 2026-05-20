"use client";

import { getAvatarProxySrc } from "../lib/avatarProxy";
import { isRemoteHttpUrl, resolveAvatarSrc } from "../lib/normalize";

const DEFAULT_AVATAR_URL = "/default-avatar.png";

type MemberParticipantAvatarProps = {
  userId: string;
  iconUrl?: string;
  lastVotedAt?: string;
  className?: string;
};

/** メンバー限定コレの参加者行用（小さめ丸アイコン） */
export default function MemberParticipantAvatar({
  userId,
  iconUrl,
  lastVotedAt,
  className = "h-6 w-6",
}: MemberParticipantAvatarProps) {
  const rawAvatar = resolveAvatarSrc(iconUrl);
  const proxied = getAvatarProxySrc(rawAvatar);
  const avatarSrc = proxied ?? rawAvatar;
  const useNoReferrer = proxied == null && isRemoteHttpUrl(rawAvatar);

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-gray-200 align-middle ring-1 ring-[rgba(0,0,0,0.06)] ${className}`}
    >
      <img
        key={`${userId}-${lastVotedAt ?? ""}-${iconUrl ?? ""}`}
        src={avatarSrc}
        alt=""
        className="h-full w-full object-cover object-center"
        width={24}
        height={24}
        loading="lazy"
        decoding="async"
        referrerPolicy={useNoReferrer ? "no-referrer" : undefined}
        onError={(e) => {
          e.currentTarget.onerror = null;
          if (proxied != null && e.currentTarget.src.includes("/api/avatar")) {
            e.currentTarget.src = rawAvatar;
            if (isRemoteHttpUrl(rawAvatar)) {
              e.currentTarget.referrerPolicy = "no-referrer";
            } else {
              e.currentTarget.removeAttribute("referrerpolicy");
            }
            return;
          }
          e.currentTarget.src = DEFAULT_AVATAR_URL;
          e.currentTarget.removeAttribute("referrerpolicy");
        }}
      />
    </span>
  );
}
