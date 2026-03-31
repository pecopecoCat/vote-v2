"use client";

import Link from "next/link";

export interface RecommendedTagsProps {
  tags: string[];
  /** 直前セクションとの余白など（例: comments 一覧下は mt-6） */
  className?: string;
}

export default function RecommendedTags({ tags, className }: RecommendedTagsProps) {
  const sectionClass = [
    "-mx-[5.333vw] w-full border-t border-b border-[#E5E7EB]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClass}>
      <div className="px-[5.333vw] py-6">
        <h2 className="mb-3 text-base font-semibold text-gray-900">おすすめタグ</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/search?tag=${encodeURIComponent(tag)}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
