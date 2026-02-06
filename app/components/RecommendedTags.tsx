"use client";

import Link from "next/link";

export interface RecommendedTagsProps {
  tags: string[];
}

export default function RecommendedTags({ tags }: RecommendedTagsProps) {
  return (
    <section className="w-full border-t border-b border-gray-200 py-4">
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
    </section>
  );
}
