import { auth } from "@/lib/auth";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { redirect } from "next/navigation";

import CompanyForm from "@/components/features/admin/company-form";

export default async function NewCompanyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const currentAdminId = session.user.id;

  const admin = await promoteConfiguredAdminUser(currentAdminId);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Créer une fiche entreprise</h1>
        <p className="text-sm text-muted-foreground">
          Ajoutez une nouvelle entreprise partenaire agréée pour le club. Elle sera sauvegardée en tant que brouillon par défaut.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <CompanyForm initialData={null} />
      </div>
    </div>
  );
}
