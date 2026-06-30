import { describe, it, expect } from "vitest";
import { getAuthErrorMessage } from "./auth-errors";
import { getOAuthErrorMessage } from "./oauth-errors";

describe("getAuthErrorMessage", () => {
  it("returns French unverified message", () => {
    expect(getAuthErrorMessage("unverified")).toBe(
      "Vérifie ton email pour te connecter. Un lien de vérification t'a été envoyé."
    );
  });

  it("returns French message for OAuthCallback", () => {
    expect(getAuthErrorMessage("OAuthCallback")).toBe(
      "La connexion avec Google a échoué. Veuillez réessayer."
    );
  });

  it("returns French message for OAuthAccountNotLinked", () => {
    expect(getAuthErrorMessage("OAuthAccountNotLinked")).toBe(
      "Ce compte Google est déjà lié à un autre utilisateur."
    );
  });

  it("returns French message for Configuration", () => {
    expect(getAuthErrorMessage("Configuration")).toBe(
      "Problème de configuration OAuth. Contacte l'administrateur."
    );
  });

  it("returns French message for AccessDenied", () => {
    expect(getAuthErrorMessage("AccessDenied")).toBe(
      "Accès refusé. Tu as peut-être annulé la connexion."
    );
  });

  it("returns generic French message for unknown errors", () => {
    expect(getAuthErrorMessage("UnknownError")).toBe(
      "Une erreur est survenue lors de la connexion. Réessaie."
    );
  });
});

describe("getOAuthErrorMessage", () => {
  it("keeps alias compatibility with the OAuth error mapper", () => {
    expect(getOAuthErrorMessage("unverified")).toBe(
      "Vérifie ton email pour te connecter. Un lien de vérification t'a été envoyé."
    );
  });

  it("still returns the generic French fallback", () => {
    expect(getOAuthErrorMessage("OAuthCallback")).toBe(
      "La connexion avec Google a échoué. Veuillez réessayer."
    );
  });
});
