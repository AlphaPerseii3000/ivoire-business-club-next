import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Mentions Légales — Ivoire Business Club',
  description:
    'Consultez les mentions légales de l’Ivoire Business Club (IBC), géré par KS Investment SA à Abidjan.',
  alternates: {
    canonical: '/mentions-legales',
  },
  openGraph: {
    title: 'Mentions Légales — Ivoire Business Club',
    description:
      'Mentions légales de l’Ivoire Business Club (IBC). Informations sur l’éditeur KS Investment SA et l’hébergeur Infomaniak.',
    url: `${SITE_URL}/mentions-legales`,
    siteName: 'Ivoire Business Club',
    locale: 'fr_FR',
    type: 'website',
  },
};

export default function MentionsLegalesPage() {
  return (
    <>
      
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
            Mentions Légales
          </h1>
          
          <p className="text-slate-400 text-sm mb-8">
            En vigueur au 8 juillet 2026.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              1. Éditeur de la plateforme
            </h2>
            <p>
              La plateforme <strong>Ivoire Business Club (IBC)</strong> est éditée par la société :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Dénomination sociale :</strong> KS Investment SA</li>
              <li><strong>Forme juridique :</strong> Société Anonyme</li>
              <li><strong>Siège social :</strong> Abidjan, Côte d’Ivoire</li>
              <li><strong>Adresse électronique :</strong> <a href="mailto:sarah@ivoire-business-club.com">sarah@ivoire-business-club.com</a></li>
              <li><strong>Téléphone :</strong> +41 79 421 47 89</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              2. Directeur de la publication
            </h2>
            <p>
              Le Directeur de la publication de la plateforme est le représentant légal de <strong>KS Investment SA</strong>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              3. Hébergement de la plateforme
            </h2>
            <p>
              La plateforme Ivoire Business Club est hébergée sur des serveurs sécurisés par :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Hébergeur :</strong> Infomaniak Network SA</li>
              <li><strong>Type de service :</strong> Cloud VPS</li>
              <li><strong>Siège social :</strong> Rue Eugène-Marziano 25, 1227 Les Acacias, Genève, Suisse</li>
              <li><strong>Site web :</strong> <a href="https://www.infomaniak.com" target="_blank" rel="noopener noreferrer">www.infomaniak.com</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              4. Propriété intellectuelle
            </h2>
            <p>
              L’ensemble des contenus présents sur la plateforme Ivoire Business Club (textes, graphismes, logos, images, vidéos, icônes) est la propriété exclusive de KS Investment SA ou de ses partenaires. Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans l’autorisation écrite préalable de KS Investment SA.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
              5. Contact
            </h2>
            <p>
              Pour toute question relative à l’utilisation de la plateforme ou pour signaler un contenu illicite, vous pouvez nous contacter par e-mail à <a href="mailto:sarah@ivoire-business-club.com">sarah@ivoire-business-club.com</a>.
            </p>
          </section>
        </article>
      </main>

    </>
  );
}
