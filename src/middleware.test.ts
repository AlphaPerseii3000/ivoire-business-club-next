import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

type MiddlewareHandler = (req: NextRequest) => unknown | Response | Promise<unknown | Response>;

const mockAuth = vi.hoisted(() =>
  vi.fn(<T extends MiddlewareHandler>(fn: T): T => fn
  )
);

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({ auth: mockAuth })),
}));

vi.mock("@/lib/auth.config", () => ({
  authConfig: {},
}));

async function loadMiddleware(): Promise<MiddlewareHandler> {
  vi.resetModules();
  const mod = await import("./middleware");
  return mod.default as unknown as MiddlewareHandler;
}

function makeRequest(pathname: string, user?: { emailVerified: boolean; onboardingCompleted: boolean }): NextRequest {
  const url = new URL(pathname, "http://localhost");
  return {
    nextUrl: url,
    auth: user ? { user } : undefined,
  } as unknown as NextRequest;
}

describe("middleware", () => {
  it("does not redirect authenticated users with incomplete onboarding on premium routes (onboarding gate is page-level)", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/dashboard/opportunities", {
        emailVerified: false,
        onboardingCompleted: false,
      })
    );
    // Middleware no longer handles onboarding — it returns undefined (no redirect)
    expect(response).toBeUndefined();
  });

  it("does not redirect unauthenticated requests (auth gate is in authorized callback)", async () => {
    const handler = await loadMiddleware();
    const response = await handler(makeRequest("/dashboard/opportunities"));
    expect(response).toBeUndefined();
  });
});
