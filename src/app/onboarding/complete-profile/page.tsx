import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CompleteProfileForm from "@/components/features/onboarding/complete-profile-form";

const pageSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  country: true,
  onboardingForm: true,
  onboardingCompletedAt: true,
};

export default async function CompleteProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return redirect("/auth/signin");
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: pageSelect,
  });

  if (!user) {
    return redirect("/auth/signin");
  }

  const onboardingFormIsObject = Boolean(user.onboardingForm) && typeof user.onboardingForm === "object" && !Array.isArray(user.onboardingForm);
  const onboarding = onboardingFormIsObject ? (user.onboardingForm as Record<string, string | null | undefined>) : null;

  const defaultValues = {
    fullName: String(onboarding?.fullName ?? user.name ?? ""),
    address: String(onboarding?.address ?? ""),
    phone: String(onboarding?.phone ?? user.phone ?? ""),
    email: user.email ?? "",
    duration: String(onboarding?.duration ?? ""),
    tier: String(onboarding?.tier ?? ""),
    activity: String(onboarding?.activity ?? ""),
    goals: String(onboarding?.goals ?? ""),
    needs: String(onboarding?.needs ?? ""),
  };

  return (
    <main className="mx-auto max-w-md px-4 py-8 md:py-12">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Complète ton profil</h1>
        <p className="text-sm text-muted-foreground">
          Finalise ton adhésion à Ivoire Business Club en quelques informations.
        </p>
      </div>
      <CompleteProfileForm defaultValues={defaultValues} />
    </main>
  );
}
