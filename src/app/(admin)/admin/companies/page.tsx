import { auth } from "@/lib/auth";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

import CompaniesListTable from "@/components/features/admin/companies-list-table";
import { Button } from "@/components/ui/button";

export default async function AdminCompaniesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const currentAdminId = session.user.id;

  const admin = await promoteConfiguredAdminUser(currentAdminId);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
  });

  const serializedCompanies = companies.map((c) => ({
    ...c,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Entreprises Agréées</h1>
          <p className="text-sm text-muted-foreground">
            Créez et gérez les fiches des entreprises partenaires agréées du club.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" render={<Link href="/admin/companies/new" />} className="min-h-11" nativeButton={false}>
            Créer une entreprise
          </Button>
          <a
            href="/admin/dashboard"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Retour au dashboard
          </a>
        </div>
      </div>

      <CompaniesListTable companies={serializedCompanies} />
    </div>
  );
}
