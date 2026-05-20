import { redirect } from "next/navigation";

import { NotificationItem } from "@/components/features/notifications/notification-item";
import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPremiumAccess } from "@/lib/subscription-access";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const access = await getUserPremiumAccess(session.user.id);
  if (!access.hasAccess) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PremiumAccessBlockedPanel />
      </div>
    );
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Notifications</p>
        <h1 className="text-2xl font-bold">Vos notifications</h1>
        <p className="text-sm text-muted-foreground">Retrouvez les intérêts et alertes liés à vos deals.</p>
      </div>

      {notifications.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationItem notification={notification} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed bg-card p-8 text-center text-muted-foreground">
          Aucune notification pour le moment.
        </div>
      )}
    </div>
  );
}
