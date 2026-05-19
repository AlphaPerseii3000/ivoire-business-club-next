"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { OPPORTUNITY_CATEGORY_FILTERS } from "@/lib/opportunity-categories";
import { cn } from "@/lib/utils";

type CategoryFilterChipsProps = {
  activeCategory?: string;
};

export function CategoryFilterChips({ activeCategory }: CategoryFilterChipsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(category: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <nav className="-mx-4 overflow-x-auto px-4" aria-label="Filtrer par catégorie">
      <div className="flex min-w-max gap-2 pb-2">
        <Link
          href={hrefFor(null)}
          className={cn(
            "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            !activeCategory ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          Toutes
        </Link>
        {OPPORTUNITY_CATEGORY_FILTERS.map((category) => (
          <Link
            key={category.value}
            href={hrefFor(category.value)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              activeCategory === category.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            {category.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
