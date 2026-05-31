import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { getDatabaseProvider, resolveSqliteDatabasePath } from "./prisma-runtime";

describe("prisma runtime provider selection", () => {
  it("uses PostgreSQL for production-style DATABASE_URL values", () => {
    expect(getDatabaseProvider("postgresql://user:pass@db.example.com:5432/ibc?schema=public")).toBe("postgresql");
    expect(getDatabaseProvider("postgres://user:pass@db.example.com:5432/ibc")).toBe("postgresql");
  });

  it("keeps SQLite available only for file: dev/test URLs", () => {
    expect(getDatabaseProvider("file:/tmp/ibc-dev.db")).toBe("sqlite");
  });

  it("rejects unsupported DATABASE_URL protocols instead of falling back to SQLite", () => {
    expect(() => getDatabaseProvider("mysql://user:pass@localhost/db")).toThrow(/DATABASE_URL must start/);
  });

  it("resolves SQLite file URLs to absolute filesystem paths for better-sqlite3", () => {
    expect(resolveSqliteDatabasePath("file:./prisma/dev.db")).toBe(path.resolve(process.cwd(), "prisma/dev.db"));
    expect(resolveSqliteDatabasePath("file:/tmp/ibc-dev.db")).toBe("/tmp/ibc-dev.db");
  });
});
