import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { isConfiguredAdminEmail, roleForEmail } from "@/lib/admin-authorization";

// Wrap PrismaAdapter to handle non-null fields that Auth.js may send as null.
// Google OAuth does not provide emailVerified, so the adapter passes null,
// but our schema requires emailVerified: Boolean (non-null).
// The Auth.js User type does not include emailVerified, so we cast through unknown.
function patchPrismaAdapter(adapter: Adapter): Adapter {
  const originalCreateUser = adapter.createUser;
  if (originalCreateUser) {
    adapter.createUser = async function (user) {
      const patched = { ...user } as Record<string, unknown>;
      if (patched["emailVerified"] === null || patched["emailVerified"] === undefined) {
        patched["emailVerified"] = false;
      }
      if (typeof patched["email"] === "string") {
        patched["role"] = roleForEmail(patched["email"]);
      }
      return originalCreateUser(patched as unknown as Awaited<ReturnType<NonNullable<Adapter["createUser"]>>>);
    };
  }
  return adapter;
}

// Full auth — Node.js runtime only (uses Prisma + bcrypt)
// Must use JWT strategy: Credentials provider is incompatible with database sessions
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  adapter: patchPrismaAdapter(PrismaAdapter(prisma)),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
        });

        if (!user || !user.passwordHash) return null;
        if (user.status === "SUSPENDED") return null;

        const isValid = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash
        );
        if (!isValid) return null;

        const role = isConfiguredAdminEmail(user.email) && user.role !== "ADMIN" ? "ADMIN" : user.role;
        if (role !== user.role) {
          await prisma.user.update({ where: { id: user.id }, data: { role } });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true, status: true },
        });
        if (existingUser?.status === "SUSPENDED") return false;
        if (existingUser && isConfiguredAdminEmail(user.email) && existingUser.role !== "ADMIN") {
          await prisma.user.update({ where: { id: existingUser.id }, data: { role: "ADMIN" } });
        }
      }
      return true;
    },
    async jwt(args) {
      const token = (authConfig.callbacks?.jwt ? await authConfig.callbacks.jwt(args) : args.token) ?? args.token;
      if (args.user) {
        token.status = (args.user as unknown as Record<string, unknown>).status ?? "ACTIVE";
      }
      return token;
    },
    async session(args) {
      const session = (authConfig.callbacks?.session ? await authConfig.callbacks.session(args) : args.session) ?? args.session;
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).status = args.token.status ?? "ACTIVE";
      }
      return session;
    },
  },
});
