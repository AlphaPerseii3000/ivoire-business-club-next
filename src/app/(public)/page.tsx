import { Hero } from "@/components/landing/hero";
import { Mission } from "@/components/landing/mission";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TargetAudience } from "@/components/landing/target-audience";
import { Benefits } from "@/components/landing/benefits";
import { Pricing } from "@/components/landing/pricing";
import { LeadMagnet } from "@/components/landing/lead-magnet";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <a href="/" className="text-xl font-bold text-primary">
            IBC
          </a>
          <nav className="flex gap-6 text-sm">
            <a href="#mission" className="hover:text-primary">Mission</a>
            <a href="#pricing" className="hover:text-primary">Tarifs</a>
            <a href="/auth/signin" className="hover:text-primary">Connexion</a>
            <a
              href="/auth/signup"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Rejoins le club
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Hero />
        <Mission />
        <HowItWorks />
        <TargetAudience />
        <Benefits />
        <Pricing />
        <LeadMagnet />
      </main>
      <Footer />
    </div>
  );
}
