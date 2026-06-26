import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Middleware uses only Edge-compatible authConfig (no Prisma, no bcrypt)
const { auth } = NextAuth(authConfig);

const PREMIUM_ROUTES = [
  "/dashboard/opportunities",
  "/members",
  "/dashboard/matching",
  "/articles",
];

function isPremiumRoute(pathname: string): boolean {
  return PREMIUM_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isOnboardingIncomplete(authUser: {
  emailVerified?: unknown;
  onboardingCompleted?: unknown;
}): boolean {
  return authUser.emailVerified !== true || authUser.onboardingCompleted !== true;
}

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const user = req.auth?.user as
    | { emailVerified?: unknown; onboardingCompleted?: unknown }
    | undefined;

  const isLoggedIn = !!user;
  const softGateApplies = isLoggedIn && isPremiumRoute(pathname);

  if (softGateApplies && user && isOnboardingIncomplete(user)) {
    return Response.redirect(new URL("/dashboard?incomplete=1", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
