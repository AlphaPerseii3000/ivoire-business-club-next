import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import AvatarUpload from "@/components/features/auth/avatar-upload";
import ProfileEditForm from "@/components/features/auth/profile-edit-form";
import { getTierBadgeConfig } from "@/lib/tier-config";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      image: true,
      phone: true,
      location: true,
      country: true,
      tier: true,
      role: true,
      verificationStatus: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/auth/signin");

  const tierInfo = getTierBadgeConfig(user.tier);
  const formattedDate = user.createdAt.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      <p className="mt-1 text-muted-foreground">
        Gère tes informations personnelles
      </p>

      {/* Profile header card */}
      <Card className="mt-6">
        <CardHeader className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <AvatarUpload
            initialImage={user.image}
            userName={user.name}
          />
          <div className="flex-1 text-center sm:text-left">
            <CardTitle className="text-xl">{user.name}</CardTitle>
            <CardDescription className="mt-1">{user.email}</CardDescription>
            <div className="mt-2 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <Badge variant="outline" className={tierInfo.className}>{tierInfo.label}</Badge>
              {user.verificationStatus === "VERIFIED" ? (
                <Badge variant="default" className="bg-green-600 text-white">
                  ✅ Vérifié
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  ⏳ Non vérifié
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Membre depuis {formattedDate}
            </p>
          </div>
        </CardHeader>
      </Card>

      <Separator className="my-6" />

      {/* Edit form */}
      <Card>
        <CardContent className="pt-6">
          <ProfileEditForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}