"use client";

import Link from "next/link";

export interface RecommendedTagsProps {
  tags: string[];
}

export default function RecommendedTags({ tags }: RecommendedTagsProps) {
  return (
    <section className="w-full my-[5.333vw] py-6">
      <div className="mb-[5.333vw] border-b border-gray-300" aria-hidden />
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        おすすめタグ
      </h2>
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
      <div className="mt-[5.333vw] border-b border-gray-300" aria-hidden />
    </section>
  );
}
