import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { Footer } from "@/components/landing/footer";
import LandingMobileNav from "@/components/landing/mobile-nav";

export const revalidate = 3600;

const title = "Business à Abidjan | Ivoire Business Club";
const description =
  "Découvrez les opportunités business à Abidjan avec l'Ivoire Business Club : investissement, networking et conseils pour entreprendre en Côte d'Ivoire.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    locale: "fr_FR",
  },
};

export default function BusinessAbidjanPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
      <LandingMobileNav />

      <header className="hidden md:flex sticky top-0 z-50 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Image src="/logo-ibc.webp" alt="IBC Logo" width={32} height={32} className="h-8 w-auto" />
            <span className="hidden sm:inline bg-gradient-to-r from-white to-[#D4A847] bg-clip-text text-transparent">
              Ivoire Business Club
            </span>
          </Link>
          <nav className="flex gap-6 text-sm items-center">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">
              Accueil
            </Link>
            <Link href="/articles" className="text-slate-300 hover:text-white transition-colors">
              Articles
            </Link>
            <Link href="/experts" className="text-slate-300 hover:text-white transition-colors">
              Experts
            </Link>
            <Link href="/partners" className="text-slate-300 hover:text-white transition-colors">
              Partenaires
            </Link>
            <Link href="/events" className="text-slate-300 hover:text-white transition-colors font-medium">
              Événements
            </Link>
            <Link href="/opportunities" className="text-slate-300 hover:text-white transition-colors font-medium">
              Opportunités
            </Link>
            <Link href="/auth/signin" className="text-slate-300 hover:text-white transition-colors">
              Connexion
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 pt-24 py-12 md:py-16">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#D4A847] bg-clip-text text-transparent sm:text-5xl">
            Business à Abidjan
          </h1>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Le guide de référence de l&apos;Ivoire Business Club pour investir, entreprendre et développer votre réseau à Abidjan, capitale économique de la Côte d&apos;Ivoire.
          </p>
        </div>

        <div className="prose prose-invert max-w-3xl">
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Pourquoi faire du business à Abidjan ?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Abidjan, capitale économique de la Côte d&apos;Ivoire, concentre la majeure partie des opportunités d&apos;affaires du pays.
            Avec son port autonome, son aéroport international Félix-Houphouët-Boigny et sa communauté d&apos;entrepreneurs dynamiques,
            la ville attire chaque année des investisseurs, startupeurs et membres de la diaspora ivoirienne résidant en Europe.
            Le business à Abidjan se distingue par un écosystème diversifié, un accès direct aux décideurs économiques
            et un cadre de vie propice aux échanges professionnels.
            Pour ceux qui cherchent un partenaire local, un deal à financer ou des conseils pour s&apos;implanter,
            la métropole abidjanaise offre un accès privilégié aux décideurs économiques et aux acteurs du développement régional.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Opportunités business à Abidjan</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Les secteurs porteurs incluent l&apos;immobilier, l&apos;agro-industrie, la tech, l&apos;énergie, les services financiers et le BTP.
            Que vous cherchiez un partenaire local, un deal à financer ou des conseils pour vous implanter,
            l&apos;écosystème abidjanais offre des opportunités concrètes et des projets en phase de scaling.
            Le business à Abidjan bénéficie également d&apos;une position stratégique en Afrique de l&apos;Ouest,
            ce qui en fait une porte d&apos;entrée privilégiée pour les marchés voisins.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            Grâce à des réformes structurantes et à un climat des affaires en amélioration constante,
            Abidjan est devenue une destination privilégiée pour les entrepreneurs souhaitant se lancer sur le continent africain.
            Les opportunités ne manquent pas, qu&apos;il s&apos;agisse de projets immobiliers, de partenariats agricoles,
            de solutions technologiques ou de montages financiers innovants.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Rejoindre un club business à Abidjan</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            L&apos;Ivoire Business Club rassemble des entrepreneurs, investisseurs et experts basés en Côte d&apos;Ivoire et en Europe.
            Notre mission est de fluidifier les mises en relation, de sécuriser les deals et d&apos;accompagner les membres
            dans leurs projets business à Abidjan et au-delà. En rejoignant le club, vous accédez à un réseau qualifié,
            à des opportunités vérifiées et à des ressources exclusives pour accélérer votre développement.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            Que vous soyez déjà installé en Côte d&apos;Ivoire ou en phase d&apos;implantation, le club vous accompagne pas à pas.
            Découvrez nos opportunités business à Abidjan, participez à nos événements networking et bénéficiez des conseils
            de nos experts agréés pour bâtir des projets durables et rentables.
          </p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 max-w-3xl">
          <Link
            href="/opportunities"
            className="inline-flex items-center justify-center rounded-md bg-[#D4A847] px-6 py-3 text-sm font-semibold text-black hover:bg-[#D4A847]/90 transition-colors"
          >
            Découvrir les opportunités
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-md border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            S&apos;inscrire au club
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
