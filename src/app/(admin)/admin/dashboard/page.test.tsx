import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminDashboardPage, { revalidate } from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mockUserFindUnique } } }));
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
    mockUserFindUnique.mockResolvedValueOnce({ role: "MEMBER" });

    await expect(AdminDashboardPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { id: "user-1" }, select: { role: true } });
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the French analytics dashboard for admins", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValueOnce({ role: "ADMIN" });

    const page = await AdminDashboardPage();
    render(page);

    expect(screen.getByText("Tableau de bord analytics")).toBeInTheDocument();
  });
});
