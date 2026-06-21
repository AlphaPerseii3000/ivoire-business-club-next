import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

import ExpertForm from "@/components/features/admin/expert-form";

type EditExpertPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditExpertPage({ params }: EditExpertPageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const currentAdminId = session.user.id;

  const admin = await promoteConfiguredAdminUser(currentAdminId);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const expert = await prisma.expert.findUnique({
    where: { id },
  });

  if (!expert) {
    notFound();
  }

  const serializedExpert = {
    id: expert.id,
    name: expert.name,
    slug: expert.slug,
    title: expert.title,
    bio: expert.bio,
    photoUrl: expert.photoUrl,
    phone: expert.phone,
    email: expert.email,
    whatsapp: expert.whatsapp,
    specialties: expert.specialties,
    requiredTier: expert.requiredTier,
    isPublished: expert.isPublished,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Modifier l'expert</h1>
        <p className="text-sm text-muted-foreground">
          Modifiez les détails du profil de l'expert ci-dessous.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <ExpertForm initialData={serializedExpert} />
      </div>
    </div>
  );
}
