export function normalizeWhatsAppNumber(number: string): string {
  return number.replace(/[^\d]/g, "");
}

type BuildWhatsAppSupportLinkInput = {
  phoneNumber?: string | null;
  message: string;
};

export function buildWhatsAppSupportLink({
  phoneNumber,
  message,
}: BuildWhatsAppSupportLinkInput): string | null {
  if (!phoneNumber?.trim()) {
    return null;
  }

  const normalized = normalizeWhatsAppNumber(phoneNumber);
  if (!normalized) {
    return null;
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
