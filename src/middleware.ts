import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Middleware uses only Edge-compatible authConfig (no Prisma, no bcrypt)
// Security headers are applied via next.config.ts headers() — covers all responses including auth redirects
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Security headers are handled by next.config.ts headers() config,
  // which applies to ALL responses (including auth redirects that bypass this callback).
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};