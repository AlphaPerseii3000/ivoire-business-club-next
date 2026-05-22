import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminAuditPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockQueryAuditLogs = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mockUserFindUnique } } }));
vi.mock("@/lib/audit-log", () => ({ queryAuditLogs: mockQueryAuditLogs }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

describe("/admin/audit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockQueryAuditLogs.mockResolvedValue({ logs: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
  });

  it("redirects unauthenticated users to sign in", async () => {
    mockAuth.mockResolvedValueOnce(null);

    await expect(AdminAuditPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/auth/signin");
    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("redirects authenticated non-admin users to the member dashboard", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockUserFindUnique.mockResolvedValueOnce({ role: "MEMBER" });

    await expect(AdminAuditPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the empty audit state for admins", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValueOnce({ role: "ADMIN" });

    const page = await AdminAuditPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByRole("heading", { name: "Journal d'audit" })).toBeInTheDocument();
    expect(screen.getByText("Aucun événement d'audit trouvé.")).toBeInTheDocument();
    expect(mockQueryAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }));
  });
});
