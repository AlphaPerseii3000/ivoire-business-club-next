import { describe, it, expect } from "vitest";
import { getOAuthErrorMessage } from "./oauth-errors";

describe("getOAuthErrorMessage", () => {
  it("returns French message for OAuthCallback", () => {
    expect(getOAuthErrorMessage("OAuthCallback")).toBe(
      "La connexion avec Google a échoué. Veuillez réessayer."
    );
  });

  it("returns French message for OAuthAccountNotLinked", () => {
    expect(getOAuthErrorMessage("OAuthAccountNotLinked")).toBe(
      "Ce compte Google est déjà lié à un autre utilisateur."
    );
  });

  it("returns French message for Configuration", () => {
    expect(getOAuthErrorMessage("Configuration")).toBe(
      "Problème de configuration OAuth. Contacte l'administrateur."
    );
  });

  it("returns French message for AccessDenied", () => {
    expect(getOAuthErrorMessage("AccessDenied")).toBe(
      "Accès refusé. Tu as peut-être annulé la connexion."
    );
  });

  it("returns generic French message for unknown errors", () => {
    expect(getOAuthErrorMessage("UnknownError")).toBe(
      "Une erreur est survenue lors de la connexion. Réessaie."
    );
  });
});
