import { SearchX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, action, icon: Icon = SearchX }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-4 py-12 text-center">
      <Icon className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
