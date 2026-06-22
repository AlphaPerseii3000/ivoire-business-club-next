import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

import CompanyForm from "@/components/features/admin/company-form";

type EditCompanyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const currentAdminId = session.user.id;

  const admin = await promoteConfiguredAdminUser(currentAdminId);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const company = await prisma.company.findUnique({
    where: { id },
  });

  if (!company) {
    notFound();
  }

  const serializedCompany = {
    id: company.id,
    name: company.name,
    slug: company.slug,
    description: company.description,
    logoUrl: company.logoUrl,
    contactName: company.contactName,
    contactPhone: company.contactPhone,
    contactEmail: company.contactEmail,
    website: company.website,
    location: company.location,
    certifications: company.certifications,
    sectors: company.sectors,
    isPublished: company.isPublished,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Modifier l'entreprise</h1>
        <p className="text-sm text-muted-foreground">
          Modifiez les détails de l'entreprise agréée ci-dessous.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <CompanyForm initialData={serializedCompany} />
      </div>
    </div>
  );
}
