import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const members = await prisma.user.findMany({
    where: { verificationStatus: "VERIFIED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      location: true,
      country: true,
      tier: true,
      bio: true,
      avatarUrl: true,
    },
  });

  const tierLabels: Record<string, string> = { AFFRANCHI: "Affranchi", GRAND_FRERE: "Grand Frère", BOSS: "Boss" };
  const tierColors: Record<string, string> = {
    AFFRANCHI: "bg-secondary text-secondary-foreground",
    GRAND_FRERE: "bg-primary text-primary-foreground",
    BOSS: "bg-accent text-accent-foreground",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Membres</h1>
      <p className="mt-1 text-muted-foreground">Découvre les membres vérifiés du club</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <div key={m.id} className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{m.name}</p>
                <span className={`inline-block rounded-md px-2 py-0.5 text-xs ${tierColors[m.tier] ?? "bg-muted"}`}>
                  {tierLabels[m.tier] ?? m.tier}
                </span>
              </div>
            </div>
            {m.bio && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{m.bio}</p>}
            <div className="mt-3 text-xs text-muted-foreground">
              {[m.location, m.country].filter(Boolean).join(" — ")}
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="mt-12 text-center text-muted-foreground">
          <p>Aucun membre vérifié pour le moment</p>
        </div>
      )}
    </div>
  );
}