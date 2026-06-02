"use client";

import Link from "next/link";

export type TagSearchLinkVariant = "pill" | "chip" | "profilePill";

const variantClass: Record<TagSearchLinkVariant, string> = {
  pill: "rounded-full text-[14px] text-blue-600 hover:underline",
  chip: "text-sm font-medium text-blue-600 hover:underline",
  profilePill:
    "profile-favorite-tag shrink-0 rounded-full bg-white/60 px-4 py-2 text-[13px] text-[#191919]",
};

export interface TagSearchLinkProps {
  tag: string;
  variant?: TagSearchLinkVariant;
  className?: string;
  children?: React.ReactNode;
}

/** タグ検索への Link（一覧での prefetch 連打を防ぐため prefetch=false 固定） */
export default function TagSearchLink({
  tag,
  variant = "chip",
  className = "",
  children,
}: TagSearchLinkProps) {
  return (
    <Link
      href={`/search?tag=${encodeURIComponent(tag)}`}
      prefetch={false}
      className={[variantClass[variant], className].filter(Boolean).join(" ")}
    >
      {children ?? (variant === "profilePill" ? tag : `#${tag}`)}
    </Link>
  );
}
