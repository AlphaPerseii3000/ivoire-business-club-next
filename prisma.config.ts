import "dotenv/config";
import { defineConfig } from "prisma/config";

function isPostgresUrl(databaseUrl?: string) {
  return Boolean(databaseUrl?.startsWith("postgresql://") || databaseUrl?.startsWith("postgres://"));
}

const databaseUrl = process.env["DATABASE_URL"];
const explicitSchema = process.env["PRISMA_SCHEMA"];
const usePostgres = isPostgresUrl(databaseUrl);

export default defineConfig({
  schema: explicitSchema ?? (usePostgres ? "prisma/schema.prisma" : "prisma/schema.dev.prisma"),
  migrations: {
    path: usePostgres ? "prisma/migrations-postgresql" : "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
