import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Middleware uses only Edge-compatible authConfig (no Prisma, no bcrypt)
// Auth and admin gating is handled by the authorized callback in auth.config.ts.
// Onboarding gating is enforced at the page level where DB access is available via auth().
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Auth and admin gating handled by authorized callback in auth.config.ts
  // Onboarding gating is enforced at page level (pages have DB access via auth())
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
