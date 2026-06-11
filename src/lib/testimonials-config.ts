export interface Testimonial {
  name: string;
  role: string;
  photo: string;
  quote: string;
  location: string;
  deals: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Amara Diabaté',
    role: 'Jeune Entrepreneure Tech',
    location: 'Abidjan',
    deals: 'Deal clos: €25k',
    photo: '/profil-1-jeune-entrepreneure-tech.webp',
    quote: "Grâce à l'IBC, j'ai pu sécuriser un financement de pré-amorçage pour ma startup fintech et trouver des mentors d'exception à Abidjan.",
  },
  {
    name: 'Marc-Antoine Koffi',
    role: 'Investisseur Senior & Business Angel',
    location: 'Paris',
    deals: '3+ deals closés',
    photo: '/profil-2-investisseur-senior-business-angel.webp',
    quote: "L'Ivoire Business Club offre un flux d'opportunités qualifiées et structurées sans équivalent pour quiconque souhaite investir sérieusement en Côte d'Ivoire.",
  },
  {
    name: 'Jean-Pierre Touré',
    role: 'Entrepreneur Local',
    location: 'Abidjan',
    deals: '2 deals closés',
    photo: '/profil-3-entrepreneur-local-cote-divoire.webp',
    quote: "L'accès aux compétences et aux réseaux d'affaires de la diaspora via le club a littéralement transformé notre chaîne logistique locale.",
  },
  {
    name: 'Awa Berthé',
    role: 'Cadre Financière & Experte en Investissement',
    location: 'Abidjan',
    deals: 'Deal clos: €50k',
    photo: '/profil-4-cadre-financiere-experte-en-investissement.webp',
    quote: "L'IBC combine rigueur professionnelle et esprit communautaire. Une synergie parfaite pour sécuriser ses investissements en Afrique de l'Ouest.",
  },
];
