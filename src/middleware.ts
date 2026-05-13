import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security-headers";

// Middleware uses only Edge-compatible authConfig (no Prisma, no bcrypt)
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const response = NextResponse.next();
  withSecurityHeaders(response);
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};