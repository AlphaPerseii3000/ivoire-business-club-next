import type { NextAuthConfig } from "next-auth";

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
        token.role = (user as unknown as Record<string, unknown>).role ?? "MEMBER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).tier = token.tier;
        (session.user as unknown as Record<string, unknown>).role = token.role;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const pathname = nextUrl.pathname;
      const isLoggedIn = !!auth?.user;
      const publicRoutes = ["/", "/pricing", "/auth/signin", "/auth/signup", "/auth/error"];
      const isPublic = publicRoutes.some((route) => pathname.startsWith(route)) || pathname.startsWith("/api/auth");

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        if ((auth?.user as unknown as Record<string, unknown>)?.role !== "ADMIN") {
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