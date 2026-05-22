import * as path from "node:path";

export type DatabaseProvider = "sqlite" | "postgresql";

export function getDatabaseProvider(databaseUrl: string): DatabaseProvider {
  if (databaseUrl.startsWith("file:")) {
    return "sqlite";
  }

  if (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://")) {
    return "postgresql";
  }

  throw new Error(
    "DATABASE_URL must start with file: for local SQLite dev/test or postgresql:// / postgres:// for production PostgreSQL",
  );
}

export function resolveSqliteDatabasePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("SQLite DATABASE_URL must start with file:");
  }

  const rawPath = databaseUrl.startsWith("file://") ? new URL(databaseUrl).pathname : databaseUrl.slice("file:".length);
  if (!rawPath) {
    throw new Error("SQLite DATABASE_URL must include a database file path");
  }

  return path.isAbsolute(rawPath) ? rawPath : path.resolve(/*turbopackIgnore: true*/ process.cwd(), rawPath);
}
