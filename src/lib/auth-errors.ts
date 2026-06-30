export function getAuthErrorMessage(error: string): string {
  switch (error) {
    case "unverified":
      return "Vérifie ton email pour te connecter. Un lien de vérification t'a été envoyé.";
    case "OAuthCallback":
      return "La connexion avec Google a échoué. Veuillez réessayer.";
    case "OAuthAccountNotLinked":
      return "Ce compte Google est déjà lié à un autre utilisateur.";
    case "Configuration":
      return "Problème de configuration OAuth. Contacte l'administrateur.";
    case "AccessDenied":
      return "Accès refusé. Tu as peut-être annulé la connexion.";
    default:
      return "Une erreur est survenue lors de la connexion. Réessaie.";
  }
}
