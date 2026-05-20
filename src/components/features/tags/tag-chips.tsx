import Link from "next/link";
import { X } from "lucide-react";

import { getTagFilterHref, getTagLabel, type SelectedTag } from "@/lib/tags";
import { cn } from "@/lib/utils";

type TagChipsProps = {
  tags: SelectedTag[];
  interactive?: boolean;
  removable?: boolean;
  onRemove?: (tag: SelectedTag) => void;
  className?: string;
};

export function TagChips({ tags, interactive = true, removable = false, onRemove, className }: TagChipsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={cn("-mx-1 overflow-x-auto px-1", className)}>
      <div className="flex min-w-max gap-2 pb-2">
        {tags.map((tag) => {
          const label = getTagLabel(tag);
          const chipClassName = "inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
          const key = `${tag.category}:${tag.value}`;
          const canRemove = removable ? Boolean(onRemove) : false;

          return interactive ? (
            <Link key={key} href={getTagFilterHref(tag)} className={chipClassName}>
              {label}
            </Link>
          ) : (
            <span key={key} className={chipClassName}>
              {label}
              {canRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove?.(tag)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Retirer le tag ${label}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
