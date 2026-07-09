export const dynamic = 'force-static';

const siteUrl = 'https://www.ivoire-business-club.com';

export function GET(): Response {
  const body = `# Ivoire Business Club

Le club business de la diaspora ivoirienne en Europe : opportunités d'investissement, networking et deals exclusifs en Côte d'Ivoire.

## Pages clés

- [Articles, Guides & Conseils](${siteUrl}/articles) — Analyses, guides d'investissement et témoignages exclusifs.
- [Événements, Conférences & Networking](${siteUrl}/events) — Calendrier des rencontres IBC en Côte d'Ivoire et en Europe.
- [Experts](${siteUrl}/experts) — Répertoire des experts et conseillers du réseau IBC.
- [Partenaires](${siteUrl}/partners) — Entreprises et partenaires sélectionnés du club.
- [Business Abidjan](${siteUrl}/business-abidjan) — Le guide pratique pour entreprendre et investir à Abidjan.
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
