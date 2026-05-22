import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AuditLog SQLite immutability triggers", () => {
  it("rejects update and delete attempts after migration triggers are installed", () => {
    const db = new Database(":memory:");
    try {
      db.exec('CREATE TABLE "users" ("id" TEXT NOT NULL PRIMARY KEY);');
      const migration = readFileSync(join(process.cwd(), "prisma/migrations/20260522100000_add_audit_logs/migration.sql"), "utf8");
      db.exec(migration);
      db.prepare('INSERT INTO "audit_logs" ("id", "action", "entityType", "entityId") VALUES (?, ?, ?, ?)').run("audit-1", "USER_VERIFY", "User", "user-1");

      expect(() => db.prepare('UPDATE "audit_logs" SET "action" = ? WHERE "id" = ?').run("USER_TIER_UPDATE", "audit-1")).toThrow(/immutable/);
      expect(() => db.prepare('DELETE FROM "audit_logs" WHERE "id" = ?').run("audit-1")).toThrow(/immutable/);
    } finally {
      db.close();
    }
  });
});
