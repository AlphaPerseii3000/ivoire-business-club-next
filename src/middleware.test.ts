import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("middleware soft-gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks /dashboard/opportunities when email is not verified", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/dashboard/opportunities", {
        emailVerified: false,
        onboardingCompleted: true,
      })
    );

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).headers.get("location")).toContain("/dashboard?incomplete=1");
  });

  it("blocks /members when onboarding is not completed", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/members", {
        emailVerified: true,
        onboardingCompleted: false,
      })
    );

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).headers.get("location")).toContain("/dashboard?incomplete=1");
  });

  it("blocks /dashboard/matching when both flags are incomplete", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/dashboard/matching", {
        emailVerified: false,
        onboardingCompleted: false,
      })
    );

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).headers.get("location")).toContain("/dashboard?incomplete=1");
  });

  it("blocks /articles when onboarding is incomplete", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/articles", {
        emailVerified: true,
        onboardingCompleted: false,
      })
    );

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).headers.get("location")).toContain("/dashboard?incomplete=1");
  });

  it("allows /dashboard when onboarding is incomplete", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/dashboard", {
        emailVerified: false,
        onboardingCompleted: false,
      })
    );

    expect(response).toBeUndefined();
  });

  it("allows /profile when onboarding is incomplete", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/profile", {
        emailVerified: false,
        onboardingCompleted: false,
      })
    );

    expect(response).toBeUndefined();
  });

  it("allows /settings when onboarding is incomplete", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/settings", {
        emailVerified: false,
        onboardingCompleted: false,
      })
    );

    expect(response).toBeUndefined();
  });

  it("allows /pricing when onboarding is incomplete", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/pricing", {
        emailVerified: false,
        onboardingCompleted: false,
      })
    );

    expect(response).toBeUndefined();
  });

  it("allows /onboarding/complete-profile when onboarding is incomplete", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/onboarding/complete-profile", {
        emailVerified: false,
        onboardingCompleted: false,
      })
    );

    expect(response).toBeUndefined();
  });

  it("allows /auth/verify-email when onboarding is incomplete", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/auth/verify-email", {
        emailVerified: false,
        onboardingCompleted: false,
      })
    );

    expect(response).toBeUndefined();
  });

  it("allows /articles when onboarding is complete", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/articles", {
        emailVerified: true,
        onboardingCompleted: true,
      })
    );

    expect(response).toBeUndefined();
  });

  it("allows /members when onboarding is complete", async () => {
    const handler = await loadMiddleware();
    const response = await handler(
      makeRequest("/members", {
        emailVerified: true,
        onboardingCompleted: true,
      })
    );

    expect(response).toBeUndefined();
  });

  it("does not redirect unauthenticated requests", async () => {
    const handler = await loadMiddleware();
    const response = await handler(makeRequest("/dashboard/opportunities"));

    expect(response).toBeUndefined();
  });
});
