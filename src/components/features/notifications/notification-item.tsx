"use client";

import Link from "next/link";

export type NotificationListItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

type NotificationItemProps = {
  notification: NotificationListItem;
};

export function NotificationItem({ notification }: NotificationItemProps) {
  const href = notification.href ?? "/dashboard/notifications";
  const isUnread = !notification.readAt;

  function markRead() {
    if (!isUnread) {
      return;
    }

    void fetch(`/api/notifications/${notification.id}/read`, { method: "POST" }).catch(() => {
      // Non-blocking: navigation to the notification target must not fail because read tracking failed.
    });
  }

  return (
    <Link
      href={href}
      onClick={markRead}
      className={`block rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isUnread ? "border-primary/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{notification.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {notification.createdAt.toLocaleDateString("fr-FR")}
        </span>
      </div>
      {isUnread ? <p className="mt-2 text-xs font-semibold text-primary">Non lu</p> : null}
    </Link>
  );
}
