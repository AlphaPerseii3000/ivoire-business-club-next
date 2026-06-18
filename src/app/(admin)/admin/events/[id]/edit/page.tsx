import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

import EventForm from "@/components/features/admin/event-form";

type EditEventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const currentAdminId = session.user.id;

  const admin = await promoteConfiguredAdminUser(currentAdminId);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    notFound();
  }

  const serializedEvent = {
    id: event.id,
    title: event.title,
    description: event.description,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate ? event.endDate.toISOString() : null,
    location: event.location,
    imageUrl: event.imageUrl,
    status: event.status,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Modifier l'événement</h1>
        <p className="text-sm text-muted-foreground">
          Modifiez les détails de l'événement ci-dessous.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <EventForm initialData={serializedEvent} />
      </div>
    </div>
  );
}
