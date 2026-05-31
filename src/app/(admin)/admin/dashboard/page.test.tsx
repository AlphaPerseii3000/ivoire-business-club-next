import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminDashboardPage, { revalidate } from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mockUserFindUnique, update: mockUserUpdate } } }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("@/components/features/admin/admin-dashboard", () => ({
  AdminDashboard: () => <div>Tableau de bord analytics</div>,
}));

describe("/admin/dashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses five-minute revalidation", () => {
    expect(revalidate).toBe(300);
  });

  it("redirects unauthenticated users to sign in", async () => {
    mockAuth.mockResolvedValueOnce(null);

    await expect(AdminDashboardPage()).rejects.toThrow("REDIRECT:/auth/signin");
    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("redirects authenticated non-admin users to the member dashboard", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockUserFindUnique.mockResolvedValueOnce({ id: "user-1", email: "member@example.com", role: "MEMBER", status: "ACTIVE" });

    await expect(AdminDashboardPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { id: "user-1" }, select: { id: true, email: true, role: true, status: true } });
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("promotes the configured bootstrap admin before rendering", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValueOnce({ id: "admin-1", email: "berseth.j@gmail.com", role: "MEMBER", status: "ACTIVE" });

    const page = await AdminDashboardPage();
    render(page);

    expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: "admin-1" }, data: { role: "ADMIN" } });
    expect(screen.getByText("Tableau de bord analytics")).toBeInTheDocument();
  });

  it("renders the French analytics dashboard for admins", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValueOnce({ id: "admin-1", email: "admin@example.com", role: "ADMIN", status: "ACTIVE" });

    const page = await AdminDashboardPage();
    render(page);

    expect(screen.getByText("Tableau de bord analytics")).toBeInTheDocument();
  });
});
