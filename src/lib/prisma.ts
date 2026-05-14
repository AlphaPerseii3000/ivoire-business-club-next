import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaBetterSqlite3({
    url: resolveSqliteDatabaseUrl(databaseUrl),
  });
  return new PrismaClient({ adapter });
}

export function resolveSqliteDatabaseUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    return databaseUrl;
  }

  const sqlitePath = databaseUrl.slice("file:".length);
  if (!sqlitePath || path.isAbsolute(sqlitePath)) {
    return databaseUrl;
  }

  return `file:${path.resolve(/*turbopackIgnore: true*/ process.cwd(), sqlitePath)}`;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
