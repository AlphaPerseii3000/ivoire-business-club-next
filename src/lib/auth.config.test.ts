import { describe, it, expect } from "vitest";
import { authConfig } from "@/lib/auth.config";

describe("authConfig authorized callback", () => {
  const authorized = authConfig.callbacks!.authorized as (
    params: { auth: { user?: { id: string; email: string; role: string } } | null; request: { nextUrl: URL } }
  ) => boolean | Response;

  function makeRequest(pathname: string, authUser?: { id: string; email: string; role: string }) {
    return {
      auth: authUser ? { user: authUser } : null,
      request: { nextUrl: new URL(`http://localhost${pathname}`) },
    };
  }

  it("allows unauthenticated requests to public routes", () => {
    expect(authorized(makeRequest("/"))).toBe(true);
    expect(authorized(makeRequest("/pricing"))).toBe(true);
    expect(authorized(makeRequest("/auth/signin"))).toBe(true);
    expect(authorized(makeRequest("/auth/signup"))).toBe(true);
    expect(authorized(makeRequest("/auth/error"))).toBe(true);
    expect(authorized(makeRequest("/api/auth/signin"))).toBe(true);
    expect(authorized(makeRequest("/articles"))).toBe(true);
    expect(authorized(makeRequest("/articles/some-slug"))).toBe(true);
  });

  it("redirects unauthenticated requests from /dashboard to /auth/signin", () => {
    const result = authorized(makeRequest("/dashboard"));
    expect(result).toBe(false);
  });

  it("does not treat protected routes as public just because / is public", () => {
    expect(authorized(makeRequest("/dashboard"))).toBe(false);
    expect(authorized(makeRequest("/dashboard/opportunities"))).toBe(false);
    expect(authorized(makeRequest("/admin"))).toBe(false);
  });

  it("redirects unauthenticated requests from /dashboard/opportunities to /auth/signin", () => {
    const result = authorized(makeRequest("/dashboard/opportunities"));
    expect(result).toBe(false);
  });

  it("redirects MEMBER requests from /admin to /", () => {
    const member = { id: "u-1", email: "m@example.com", role: "MEMBER" };
    const result = authorized(makeRequest("/admin", member));
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("allows ADMIN requests to /admin", () => {
    const admin = { id: "u-1", email: "a@example.com", role: "ADMIN" };
    expect(authorized(makeRequest("/admin", admin))).toBe(true);
    expect(authorized(makeRequest("/admin/members", admin))).toBe(true);
  });

  it("allows the configured bootstrap admin email even while the token role is still MEMBER", () => {
    const bootstrapAdmin = { id: "u-1", email: "berseth.j@gmail.com", role: "MEMBER" };

    expect(authorized(makeRequest("/admin", bootstrapAdmin))).toBe(true);
    expect(authorized(makeRequest("/admin/members", bootstrapAdmin))).toBe(true);
  });

  it("upgrades the bootstrap admin role in jwt and session callbacks", async () => {
    const jwt = authConfig.callbacks!.jwt! as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    const session = authConfig.callbacks!.session! as unknown as (args: Record<string, unknown>) => Promise<{ user?: Record<string, unknown> }>;

    const token = await jwt({
      token: { email: "berseth.j@gmail.com", role: "MEMBER" },
      user: undefined,
      account: null,
      profile: undefined,
      trigger: undefined,
      isNewUser: false,
    });
    const hydratedSession = await session({
      session: { user: { id: "u-1", email: "berseth.j@gmail.com", name: "Jonathan" }, expires: "" },
      token: { id: "u-1", email: "berseth.j@gmail.com", role: "MEMBER", tier: "AFFRANCHI" },
      user: undefined,
      newSession: undefined,
      trigger: undefined,
    });

    expect(token.role).toBe("ADMIN");
    expect(hydratedSession.user?.role).toBe("ADMIN");
  });

  it("allows authenticated MEMBER requests to tier-gated dashboard routes", () => {
    const member = { id: "u-1", email: "m@example.com", role: "MEMBER" };
    expect(authorized(makeRequest("/dashboard/deals", member))).toBe(true);
    expect(authorized(makeRequest("/dashboard/subscription", member))).toBe(true);
  });

  it("redirects logged-in users away from /auth/signin to /dashboard", () => {
    const member = { id: "u-1", email: "m@example.com", role: "MEMBER" };
    const result = authorized(makeRequest("/auth/signin", member));
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("redirects logged-in users away from /auth/signup to /dashboard", () => {
    const member = { id: "u-1", email: "m@example.com", role: "MEMBER" };
    const result = authorized(makeRequest("/auth/signup", member));
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("allows authenticated requests to /dashboard", () => {
    const member = { id: "u-1", email: "m@example.com", role: "MEMBER" };
    expect(authorized(makeRequest("/dashboard", member))).toBe(true);
  });
});
