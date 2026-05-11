import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) redirect("/auth/signin");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      <p className="mt-1 text-muted-foreground">Gère tes informations personnelles</p>

      <form id="profile-form" className="mt-8 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">Nom complet</label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={user.name ?? ""}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={user.email}
            disabled
            className="mt-1 block w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">L&apos;email ne peut pas être modifié</p>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium">Bio</label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            defaultValue={user.bio ?? ""}
            placeholder="Décris-toi en quelques mots..."
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium">Téléphone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={user.phone ?? ""}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="+225 XX XX XX XX"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium">Localisation</label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={user.location ?? ""}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Abidjan, Côte d&apos;Ivoire"
          />
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium">Pays</label>
          <input
            id="country"
            name="country"
            type="text"
            defaultValue={user.country ?? ""}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Côte d&apos;Ivoire"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Vérification</label>
          <p className="mt-1 text-sm">
            {user.verificationStatus === "VERIFIED" ? (
              <span className="text-accent">✅ Vérifié</span>
            ) : (
              <span className="text-muted-foreground">⏳ Non vérifié — <a href="/settings#verification" className="text-primary hover:underline">En savoir plus</a></span>
            )}
          </p>
        </div>

        <button
          type="submit"
          formAction="/api/user/profile"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sauvegarder
        </button>
      </form>
    </div>
  );
}