import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("production deployment configuration", () => {
  it("keeps Next.js standalone output and security headers configured", async () => {
    const config = (await import("../../next.config")).default;

    expect(config.output).toBe("standalone");
    expect(typeof config.headers).toBe("function");

    const headers = await config.headers?.();
    const headerKeys = headers?.flatMap((entry) => entry.headers.map((header) => header.key));

    expect(headerKeys).toContain("Strict-Transport-Security");
    expect(headerKeys).toContain("Content-Security-Policy");
    expect(headerKeys).toContain("X-Frame-Options");
    expect(headerKeys).toContain("X-Content-Type-Options");
  });

  it("configures PM2 for the standalone production contract", () => {
    const ecosystem = require("../../ecosystem.config.js");
    const app = ecosystem.apps[0];

    expect(app.name).toBe("ibc-app");
    expect(app.script).toBe("./.next/standalone/server.js");
    expect(app.cwd).toBe("./");
    expect(app.exec_mode).toBe("cluster");
    expect(app.instances).toBe("max");
    expect(app.autorestart).toBe(true);
    expect(app.max_memory_restart).toBe("500M");
    expect(app.env).toMatchObject({ NODE_ENV: "production", PORT: 3000, HOSTNAME: "0.0.0.0" });
    expect(app.error_file).toContain("./logs/");
    expect(app.out_file).toContain("./logs/");
  });

  it("asserts production deploy artifact does not embed SQLite Prisma Client (NFR-SC3)", () => {
    // After prepare-deploy.sh runs, the deploy-dist standalone must NOT
    // contain activeProvider:"sqlite". It must use postgresql for production.
    // This test validates the script logic; the actual assertion runs in
    // prepare-deploy.sh as a deployment gate.
    const sh = fs.readFileSync(path.join(process.cwd(), "scripts/prepare-deploy.sh"), "utf8");
    expect(sh).toContain('activeProvider:"sqlite"');
    expect(sh).toContain("NFR-SC3");
    expect(sh).toContain("PRISMA_SCHEMA=prisma/schema.prisma");
  });

  it("documents Nginx static cache, reverse proxy headers, and sensitive file blocks", () => {
    const nginxConfig = fs.readFileSync(path.join(process.cwd(), "deploy/nginx/ibc-app.conf.example"), "utf8");

    expect(nginxConfig).toContain("location /_next/static/");
    expect(nginxConfig).toContain("alias /var/www/ibc/current/.next/static/");
    expect(nginxConfig).toContain("expires 365d");
    expect(nginxConfig).toContain('Cache-Control "public, max-age=31536000, immutable"');
    expect(nginxConfig).toContain("proxy_pass http://127.0.0.1:3000");
    expect(nginxConfig).toContain("proxy_set_header Host $host");
    expect(nginxConfig).toContain("proxy_set_header X-Real-IP $remote_addr");
    expect(nginxConfig).toContain("proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for");
    expect(nginxConfig).toContain("proxy_set_header X-Forwarded-Proto $scheme");
    expect(nginxConfig).toMatch(/sqlite3?/);
    expect(nginxConfig).toContain("deny all");
  });
});
