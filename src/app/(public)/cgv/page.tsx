import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente (CGV) — IBC',
  description:
    'Consultez les Conditions Générales de Vente (CGV) de l\u2019Ivoire Business Club (IBC). Tarifs, abonnements et modalités de paiement.',
  alternates: {
    canonical: '/cgv',
  },
  openGraph: {
    title: 'Conditions Générales de Vente (CGV) — IBC',
    description:
      'Conditions Générales de Vente (CGV) de l\u2019Ivoire Business Club (IBC). Tarifs, virement bancaire, Mobile Money et validation.',
    url: 'https://ivoire-business-club.com/cgv',
    siteName: 'Ivoire Business Club',
    locale: 'fr_FR',
    type: 'website',
  },
};

export default function CgvPage() {
  return (
    <div className="bg-[#090D16] min-h-screen text-slate-300 flex flex-col font-sans">
      
      {/* Header Desktop */}
      
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
            Conditions Générales de Vente
          </h1>
          
          <p className="text-slate-400 text-sm mb-8">
            En vigueur au 8 juillet 2026.
          </p>

          <p>
            Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent l’accès et la souscription aux abonnements proposés sur la plateforme <strong>Ivoire Business Club (IBC)</strong>, éditée par la société <strong>KS Investment SA</strong>.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              1. Formules d’abonnement & Tarifs
            </h2>
            <p>
              L’Ivoire Business Club propose trois (3) tiers d’adhésion avec des services et droits d’accès distincts :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Tiers « Affranchis » :</strong>
                <ul className="list-circle pl-6 mt-1 space-y-1">
                  <li>Mensuel : 29 € / mois (19 000 CFA)</li>
                  <li>Semestriel : 160 € (105 000 CFA)</li>
                  <li>Annuel : 290 € (190 000 CFA)</li>
                </ul>
              </li>
              <li>
                <strong>Tiers « Grands Frères » :</strong>
                <ul className="list-circle pl-6 mt-1 space-y-1">
                  <li>Mensuel : 59 € / mois (39 000 CFA)</li>
                  <li>Semestriel : 299 € (196 000 CFA)</li>
                  <li>Annuel : 590 € (387 000 CFA)</li>
                </ul>
              </li>
              <li>
                <strong>Tiers « Boss » :</strong>
                <ul className="list-circle pl-6 mt-1 space-y-1">
                  <li>Mensuel : 129 € / mois (85 000 CFA)</li>
                  <li>Semestriel : 690 € (453 000 CFA)</li>
                  <li>Annuel : 1 290 € (846 000 CFA)</li>
                </ul>
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              2. Modalités de paiement
            </h2>
            <p>
              Afin de préserver la sécurité des opérations et la qualité des membres, tous les paiements tiers automatisés (tels que Stripe ou CinetPay) ont été retirés de la plateforme. La souscription s’effectue exclusivement via les moyens suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Virement bancaire :</strong> À destination du compte bancaire de <strong>KS Investment</strong> (les coordonnées bancaires EUR et XOF sont affichées dans l’espace membre lors de la sélection de l’offre).</li>
              <li><strong>Mobile Money :</strong> Option disponible pour la Côte d’Ivoire (Wave, Orange Money, MTN Mobile Money, Moov Money) selon les instructions fournies lors du parcours de paiement.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              3. Processus de validation manuelle
            </h2>
            <p>
              Une fois le virement bancaire effectué ou le transfert Mobile Money réalisé, le membre doit soumettre sa preuve de virement (reçu ou capture d’écran) directement via son interface d’onboarding ou de profil.
            </p>
            <p className="mt-2 text-[#D4A847] font-semibold">
              <span role="img" aria-label="Avertissement">⚠️</span> Délai de traitement : L’activation de l’abonnement fait l’objet d’une validation manuelle par l’équipe administrative de KS Investment sous un délai maximal de 48 heures ouvrées à compter de la réception de la preuve de paiement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              4. Politique de résiliation & Remboursement
            </h2>
            <p>
              L’utilisateur peut demander la résiliation de son abonnement à tout moment depuis son espace profil ou en envoyant un e-mail à l’adresse dédiée. 
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Fin de service :</strong> L’abonnement reste actif et utilisable jusqu’à la fin de la période de facturation en cours (mensuelle, semestrielle ou annuelle).</li>
              <li><strong>Aucun remboursement partiel :</strong> En cas de résiliation anticipée en cours de période d’engagement, aucun remboursement au prorata temporis ou partiel ne sera accordé par KS Investment.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              5. Service Client
            </h2>
            <p>
              Pour toute question, réclamation ou assistance concernant votre abonnement et les modalités de paiement, vous pouvez contacter notre service client par e-mail à : <a href="mailto:sarah@ivoire-business-club.com">sarah@ivoire-business-club.com</a>.
            </p>
          </section>
        </article>
      </main>

          </div>
  );
}
