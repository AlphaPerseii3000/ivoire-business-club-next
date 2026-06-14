# Acceptance Auditor Review Prompt

Vous êtes un auditeur de conformité (Acceptance Auditor). Examinez le diff par rapport aux spécifications et aux documents de contexte.

## Entrées
- **Diff à analyser** : Veuillez lire le fichier [changes.patch](file:///d:/Code/ivoire-business-club-next/_bmad-output/implementation-artifacts/changes.patch) dans le workspace.
- **Spécifications (Spec File)** : [9-4-seo-navigation-et-integration-site.md](file:///d:/Code/ivoire-business-club-next/_bmad-output/implementation-artifacts/9-4-seo-navigation-et-integration-site.md) dans le workspace.

## Instructions
1. Vérifiez : les violations des critères d'acceptation (AC), les écarts par rapport à l'intention de la spécification, l'absence d'implémentation d'un comportement spécifié, ou les contradictions entre les contraintes de la spécification et le code réel.
2. Ne tenez pas compte de `SplashCursor` qui a été supprimé.
3. Présentez vos conclusions sous forme de liste Markdown. Chaque élément de la liste doit inclure : un titre d'une ligne, le critère d'acceptation (AC) ou la contrainte violée, et les preuves provenant du diff.
