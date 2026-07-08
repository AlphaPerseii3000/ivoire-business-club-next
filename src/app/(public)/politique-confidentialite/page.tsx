import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import LandingMobileNav from '@/components/landing/mobile-nav';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — IBC',
  description:
    'Découvrez comment l\u2019Ivoire Business Club (IBC) protège vos données personnelles conformément à l\u2019APDP et au RGPD.',
  alternates: {
    canonical: '/politique-confidentialite',
  },
  openGraph: {
    title: 'Politique de Confidentialité — IBC',
    description:
      'Politique de protection des données personnelles de l\u2019Ivoire Business Club. Conformité APDP (Loi 2013-450) et RGPD.',
    url: 'https://ivoire-business-club.com/politique-confidentialite',
    siteName: 'Ivoire Business Club',
    locale: 'fr_FR',
    type: 'website',
  },
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="bg-[#090D16] min-h-screen text-slate-300 flex flex-col font-sans">
      <LandingMobileNav />

      {/* Header Desktop */}
      <header className="hidden md:flex sticky top-0 z-40 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2"
          >
            <img src="/logo-ibc-landing.webp" alt="IBC Logo" className="h-8 w-auto" />
            <span className="bg-gradient-to-r from-white to-[#D4A847] bg-clip-text text-transparent">
              Ivoire Business Club
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[#D4A847]" />
            <span>Retour à l’accueil</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16 md:py-24">
        {/* Mobile back link */}
        <div className="md:hidden mb-8 mt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#D4A847] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour à l’accueil</span>
          </Link>
        </div>

        <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-[#D4A847] prose-strong:text-white prose-headings:font-bold">
          <h1 className="text-3xl font-extrabold text-white mb-8 bg-gradient-to-r from-white to-[#D4A847] bg-clip-text text-transparent">
            Politique de Confidentialité
          </h1>
          
          <p className="text-slate-400 text-sm mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}.
          </p>

          <p>
            L’Ivoire Business Club (IBC), édité par <strong>KS Investment SA</strong>, accorde une importance primordiale à la protection de la vie privée et des données personnelles de ses membres et visiteurs. La présente politique détaille notre démarche de traitement de vos données de manière transparente et sécurisée.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              1. Données collectées
            </h2>
            <p>
              Nous collectons et traitons les informations nécessaires au fonctionnement de la plateforme, au suivi des abonnements et à la mise en relation d’affaires. Ces données incluent :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Données de profil :</strong> Nom, prénom, adresse e-mail, numéro de téléphone, pays de résidence.</li>
              <li><strong>Données d’affaires :</strong> Titre de poste, entreprise, secteurs d’activité, tags de compétences ou d’intérêts d’affaires.</li>
              <li><strong>Données de transaction :</strong> Reçus et justificatifs de virement bancaire ou Mobile Money transmis pour l’activation manuelle de l’abonnement.</li>
              <li><strong>Données de conformité (KYC) :</strong> Pièce d’identité et documents justificatifs requis dans le cadre de notre devoir de vigilance (vérification des membres).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              2. Finalités du traitement
            </h2>
            <p>
              Vos données sont traitées pour des finalités spécifiques et légitimes :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Gestion et activation de votre compte membre.</li>
              <li>Mise en relation d’affaires qualifiées au sein du club.</li>
              <li>Vérification administrative des paiements d’abonnements.</li>
              <li>Lutte contre la fraude et le blanchiment d’argent.</li>
              <li>Envoi d’e-mails administratifs et de notifications d’intérêt (matching de deals).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              3. Durée de conservation des données
            </h2>
            <p>
              Vos données personnelles sont conservées uniquement pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Données de profil et d’affaires :</strong> Conservées jusqu’à la suppression de votre profil ou la fermeture de votre compte.</li>
              <li><strong>Documents de conformité (KYC) et transactions :</strong> Conformément aux obligations légales applicables en Côte d’Ivoire en matière de lutte contre le blanchiment et le financement du terrorisme, et pour assurer notre conformité avec les exigences de la <strong>CENTIF-CI</strong> (Cellule Nationale de Traitement des Informations Financières de Côte d’Ivoire), tous les justificatifs de virement, reçus de transaction et documents de conformité sont archivés de manière sécurisée pendant une durée de <strong>cinq (5) ans</strong> à compter de la transaction ou de la clôture du compte.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              4. Cadre légal et Régulations
            </h2>
            <p>
              Le traitement de vos données est régi par les cadres juridiques suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Régulation ivoirienne :</strong> Conformité avec l’Autorité de Protection des Données à Caractère Personnel (<strong>APDP</strong>) en vertu de la Loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel en Côte d’Ivoire.</li>
              <li><strong>Règlement Général sur la Protection des Données (RGPD) :</strong> Pour nos membres et visiteurs résidant dans l’Union Européenne, nous appliquons les exigences du Règlement (UE) 2016/679 en matière de droits d’accès, de rectification, de portabilité et de suppression de leurs données.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              5. Droits des utilisateurs
            </h2>
            <p>
              Vous disposez de droits étendus sur vos données personnelles : droit d’accès, de rectification, d’opposition, de limitation du traitement, de portabilité et de suppression (droit à l’oubli). Vous pouvez exercer ces droits à tout moment en nous envoyant une demande écrite accompagnée d’un justificatif d’identité à l’adresse e-mail : <a href="mailto:sarah@ivoire-business-club.com">sarah@ivoire-business-club.com</a>.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
