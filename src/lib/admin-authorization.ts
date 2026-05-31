const BOOTSTRAP_ADMIN_EMAILS = ["berseth.j@gmail.com"];

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function configuredAdminEmails() {
  const envEmails = process.env.ADMIN_EMAILS?.split(",") ?? [];
  return new Set([...BOOTSTRAP_ADMIN_EMAILS, ...envEmails].map(normalizeEmail).filter(Boolean));
}

export function isConfiguredAdminEmail(email: string | null | undefined) {
  return configuredAdminEmails().has(normalizeEmail(email));
}

export function roleForEmail(email: string | null | undefined) {
  return isConfiguredAdminEmail(email) ? "ADMIN" : "MEMBER";
}
