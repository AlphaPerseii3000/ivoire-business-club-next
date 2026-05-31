import type { NextAuthConfig } from "next-auth";
import { isConfiguredAdminEmail, roleForEmail } from "@/lib/admin-authorization";

// Edge-compatible auth config — NO Prisma, NO bcrypt, NO Node.js modules
// Used only in middleware (Edge Runtime)
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    newUser: "/auth/signup",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tier = (user as unknown as Record<string, unknown>).tier ?? "AFFRANCHI";
        token.role = roleForEmail(user.email) === "ADMIN" ? "ADMIN" : (user as unknown as Record<string, unknown>).role ?? "MEMBER";
      } else if (isConfiguredAdminEmail(token.email)) {
        token.role = "ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).tier = token.tier;
        (session.user as unknown as Record<string, unknown>).role = isConfiguredAdminEmail(session.user.email) ? "ADMIN" : token.role;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const pathname = nextUrl.pathname;
      const isLoggedIn = !!auth?.user;
      const publicRoutes = ["/pricing", "/auth/signin", "/auth/signup", "/auth/error"];
      const isPublic = pathname === "/" || publicRoutes.some((route) => pathname.startsWith(route)) || pathname.startsWith("/api/auth");

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        const user = auth?.user as { email?: string | null; role?: string } | undefined;
        if (user?.role !== "ADMIN" && !isConfiguredAdminEmail(user?.email)) {
          return Response.redirect(new URL("/", nextUrl));
        }
      }

      if (!isPublic && !pathname.startsWith("/api")) {
        if (!isLoggedIn) return false;
      }

      if (isLoggedIn && (pathname.startsWith("/auth/signin") || pathname.startsWith("/auth/signup"))) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
  providers: [],
};
