import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminMembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const members = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      tier: true,
      role: true,
      verificationStatus: true,
      createdAt: true,
    },
  });

  const tierLabels: Record<string, string> = { AFFRANCHI: "Affranchi", GRAND_FRERE: "Grand Frère", BOSS: "Boss" };
  const roleLabels: Record<string, string> = { MEMBER: "Membre", ADMIN: "Admin" };
  const verificationLabels: Record<string, string> = { PENDING: "⏳", VERIFIED: "✅", REJECTED: "❌" };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Membres</h1>
        <a href="/admin" className="text-sm text-muted-foreground hover:text-primary">← Retour</a>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-3 text-left font-medium">Nom</th>
              <th className="py-3 text-left font-medium">Email</th>
              <th className="py-3 text-left font-medium">Plan</th>
              <th className="py-3 text-left font-medium">Rôle</th>
              <th className="py-3 text-left font-medium">Vérifié</th>
              <th className="py-3 text-left font-medium">Inscription</th>
              <th className="py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b hover:bg-muted/50">
                <td className="py-3">{m.name}</td>
                <td className="py-3 text-muted-foreground">{m.email}</td>
                <td className="py-3">
                  <span className="text-xs">{tierLabels[m.tier] ?? m.tier}</span>
                </td>
                <td className="py-3">{roleLabels[m.role] ?? m.role}</td>
                <td className="py-3">{verificationLabels[m.verificationStatus] ?? m.verificationStatus}</td>
                <td className="py-3 text-muted-foreground">{new Date(m.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="py-3">
                  <form action={`/api/admin/users/${m.id}/verify`} method="POST" style={{ display: "inline" }}>
                    {m.verificationStatus === "PENDING" && (
                      <button type="submit" name="action" value="verify" className="text-xs text-accent hover:underline">Vérifier</button>
                    )}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}