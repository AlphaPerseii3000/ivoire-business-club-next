/**
 * Format an opportunity amount with the correct currency symbol.
 * EUR → "600 000 €"    XOF → "600 000 FCFA"
 */
export function formatOpportunityAmount(amount: number | null | undefined, currency: string = "EUR"): string {
  if (amount === null || amount === undefined) {
    return "Montant sur demande";
  }

  const formatted = amount.toLocaleString("fr-FR");

  if (currency === "XOF") {
    return `${formatted} FCFA`;
  }

  return `${formatted} €`;
}

/**
 * Currency options for opportunity creation/edit forms.
 */
export const CURRENCY_OPTIONS = [
  { value: "EUR", label: "Euro (€)" },
  { value: "XOF", label: "FCFA (XOF)" },
] as const;

/**
 * Short label for a currency code, used in form selects.
 */
export function getCurrencyLabel(code: string): string {
  return CURRENCY_OPTIONS.find((o) => o.value === code)?.label ?? code;
}