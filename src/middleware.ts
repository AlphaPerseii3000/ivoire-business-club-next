import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Middleware uses only Edge-compatible authConfig (no Prisma, no bcrypt)
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Route protection is handled by the `authorized` callback in authConfig
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};