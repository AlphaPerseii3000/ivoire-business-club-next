import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { isConfiguredAdminEmail, roleForEmail } from "@/lib/admin-authorization";
import { sendWelcomeEmail } from "@/lib/email";
import { sanitizeError } from "@/lib/sanitize-log";

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
          emailVerified: user.emailVerified,
          onboardingCompleted: user.onboardingCompletedAt !== null,
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
          select: { id: true, role: true, status: true, createdAt: true, emailVerified: true },
        });
        if (existingUser?.status === "SUSPENDED") return false;
        if (existingUser && isConfiguredAdminEmail(user.email) && existingUser.role !== "ADMIN") {
          await prisma.user.update({ where: { id: existingUser.id }, data: { role: "ADMIN" } });
        }

        if (!existingUser?.emailVerified) {
          try {
            const { sendVerificationEmailToUser } = await import("@/lib/verification-email.server");
            const targetUserId = existingUser?.id ?? (user.id as string | undefined);
            if (targetUserId) {
              await sendVerificationEmailToUser(targetUserId);
            }
            return `${process.env.APP_URL ?? ""}/dashboard?resend=1`;
          } catch (verificationError) {
            console.error("Failed to auto-resend verification email to Google user:", sanitizeError(verificationError));
          }
        }

        // Welcome email only for newly created Google OAuth accounts
        const createdAt = existingUser?.createdAt ?? null;
        const isNewUser = createdAt ? (Date.now() - createdAt.getTime()) <= 60 * 1000 : false;
        if (isNewUser) {
          try {
            await sendWelcomeEmail({
              to: user.email,
              name: user.name,
              // Google users start without a subscription tier; default to AFFRANCHI copy.
              tier: "AFFRANCHI",
              userId: existingUser?.id || user.id || undefined,
            });
          } catch (welcomeEmailError) {
            console.error("Failed to send welcome email to Google user:", sanitizeError(welcomeEmailError));
          }
        }

        return true;
      }

      if (account?.provider === "credentials" && user.id) {
        try {
          const { sendVerificationEmailToUser } = await import("@/lib/verification-email.server");
          if (user.emailVerified === false) {
            await sendVerificationEmailToUser(user.id as string);
            return `${process.env.APP_URL ?? ""}/dashboard?resend=1`;
          }
        } catch (verificationError) {
          console.error("Failed to auto-resend verification email on credentials sign-in:", sanitizeError(verificationError));
        }
      }

      return true;
    },
    async jwt(args) {
      const token = (authConfig.callbacks?.jwt ? await authConfig.callbacks.jwt(args) : args.token) ?? args.token;
      if (args.user) {
        const user = args.user as unknown as Record<string, unknown>;
        token.status = user.status ?? "ACTIVE";
        token.emailVerified = typeof user.emailVerified === "boolean" ? user.emailVerified : false;
        token.onboardingCompleted = !!user.onboardingCompleted;
      }
      return token;
    },
    async session(args) {
      const session = (authConfig.callbacks?.session ? await authConfig.callbacks.session(args) : args.session) ?? args.session;
      if (session.user) {
        const sessionUser = session.user as unknown as Record<string, unknown>;
        sessionUser.status = args.token.status ?? "ACTIVE";
        sessionUser.emailVerified = typeof args.token.emailVerified === "boolean" ? args.token.emailVerified : false;
        sessionUser.onboardingCompleted = !!args.token.onboardingCompleted;
      }
      return session;
    },
  },
});
