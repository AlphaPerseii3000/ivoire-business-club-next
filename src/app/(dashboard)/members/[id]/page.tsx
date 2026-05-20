import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { WhatsAppCTA } from "@/components/features/deals/whatsapp-cta";
import { TagChips } from "@/components/features/tags/tag-chips";
import { getTierBadgeConfig } from "@/lib/tier-config";

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const member = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      bio: true,
      image: true,
      phone: true,
      location: true,
      country: true,
      tier: true,
      verificationStatus: true,
      createdAt: true,
      tags: { orderBy: [{ category: "asc" }, { value: "asc" }], select: { category: true, value: true } },
    },
  });

  if (!member || member.verificationStatus !== "VERIFIED") {
    notFound();
  }

  const isOwnProfile = session.user.id === member.id;
  const tierInfo = getTierBadgeConfig(member.tier);
  const memberSince = member.createdAt.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
  });
  const locationParts = [member.location, member.country].filter(Boolean);
  const locationDisplay = locationParts.length > 0 ? locationParts.join(" — ") : null;
  const hasTags = member.tags.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/members" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour aux membres
      </Link>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{member.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={tierInfo.className}>{tierInfo.label}</Badge>
              <Badge variant="default" className="bg-green-600 text-white">✅ Vérifié</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Membre depuis {memberSince}</p>
          </div>
        </div>

        {member.bio ? (
          <div className="mt-6">
            <h2 className="font-semibold">À propos</h2>
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{member.bio}</p>
          </div>
        ) : null}

        {locationDisplay ? (
          <div className="mt-4 text-sm text-muted-foreground">
            {locationDisplay}
          </div>
        ) : null}

        {hasTags ? (
          <div className="mt-6">
            <h2 className="font-semibold">Tags</h2>
            <div className="mt-2">
              <TagChips tags={member.tags} />
            </div>
          </div>
        ) : null}

        {isOwnProfile ? null : (
          <div className="mt-6">
            <WhatsAppCTA
              phoneNumber={member.phone}
              prefilledMessage="Bonjour, je suis intéressé(e) par votre profil sur IBC."
              label="Discuter sur WhatsApp"
            />
          </div>
        )}
      </div>
    </div>
  );
}