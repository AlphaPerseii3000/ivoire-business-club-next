import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Tier, UserRole, UserStatus } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tier: Tier;
      role: UserRole;
      status: UserStatus;
      emailVerified: boolean;
      onboardingCompleted: boolean;
      provider?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    tier?: Tier;
    role?: UserRole;
    status?: UserStatus;
    emailVerified?: boolean;
    onboardingCompleted?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    tier?: Tier;
    role?: UserRole;
    status?: UserStatus;
    emailVerified?: boolean;
    onboardingCompleted?: boolean;
    provider?: string;
  }
}
