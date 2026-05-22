import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseProvider, resolveSqliteDatabasePath } from "./prisma-runtime";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const provider = getDatabaseProvider(databaseUrl);

  if (provider === "postgresql") {
    return new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
  }

  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("Production DATABASE_URL must use PostgreSQL, not SQLite");
  }

  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: resolveSqliteDatabasePath(databaseUrl) }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
