import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminMemberDetailPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
}));
const mockPush = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mockUserFindUnique } },
}));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));
vi.mock("@/components/features/admin/admin-member-reminder-button", () => ({
  AdminMemberReminderButton: ({ userId, disabled }: { userId: string; disabled: boolean }) => (
    <button data-testid="reminder-button" data-userid={userId} data-disabled={disabled}>Relancer par email</button>
  ),
}));
vi.mock("@/components/features/admin/admin-member-invite-button", () => ({
  AdminMemberInviteButton: ({ userId, disabled }: { userId: string; disabled?: boolean }) => (
    <button data-testid="invite-button" data-userid={userId} data-disabled={disabled}>Inviter à définir le mot de passe</button>
  ),
}));

function buildMember(overrides: Partial<ReturnType<typeof baseMember>> = {}) {
  return { ...baseMember(), ...overrides };
}

function baseMember() {
  return {
    id: "member-1",
    name: "Awa Koné",
    email: "awa@example.com",
    emailVerified: true,
    onboardingCompletedAt: new Date("2026-05-10T10:00:00Z"),
    bio: "Une biographie",
    location: "Abidjan",
    country: "CI",
    status: "ACTIVE",
    verificationStatus: "PENDING",
    passwordHash: "hashed-pwd",
    createdAt: new Date("2026-05-10T10:00:00Z"),
  };
}

describe("AdminMemberDetailPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve(buildMember());
    });
  });

  it("redirects unauthenticated visitors to sign-in", async () => {
    mockAuth.mockResolvedValueOnce(null);

    await expect(AdminMemberDetailPage({ params: Promise.resolve({ id: "member-1" }) })).rejects.toThrow("redirect:/auth/signin");
  });

  it("redirects non-admin users to the dashboard", async () => {
    mockUserFindUnique.mockImplementationOnce((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "MEMBER", status: "ACTIVE" });
      }
      return Promise.resolve(buildMember());
    });

    await expect(AdminMemberDetailPage({ params: Promise.resolve({ id: "member-1" }) })).rejects.toThrow("redirect:/dashboard");
  });

  it("renders member details and badges", async () => {
    render(await AdminMemberDetailPage({ params: Promise.resolve({ id: "member-1" }) }));

    expect(screen.getByRole("heading", { name: "Awa Koné" })).toBeInTheDocument();
    expect(screen.getByText("awa@example.com")).toBeInTheDocument();
    expect(screen.getByText("Email ✓")).toBeInTheDocument();
    expect(screen.getByText("Profil ✓")).toBeInTheDocument();
  });

  it("shows the reminder button for an incomplete member", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve(buildMember({ emailVerified: false, onboardingCompletedAt: null }));
    });

    render(await AdminMemberDetailPage({ params: Promise.resolve({ id: "member-1" }) }));

    expect(screen.getByText("Email ✗")).toBeInTheDocument();
    expect(screen.getByText("Profil ✗")).toBeInTheDocument();
    expect(screen.getByTestId("reminder-button")).toBeInTheDocument();
  });

  it("hides the reminder button when onboarding is complete", async () => {
    render(await AdminMemberDetailPage({ params: Promise.resolve({ id: "member-1" }) }));

    expect(screen.queryByTestId("reminder-button")).not.toBeInTheDocument();
  });

  it("disables the reminder button when the member is suspended", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve(buildMember({ emailVerified: false, status: "SUSPENDED" }));
    });

    render(await AdminMemberDetailPage({ params: Promise.resolve({ id: "member-1" }) }));

    const button = screen.getByTestId("reminder-button");
    expect(button).toHaveAttribute("data-disabled", "true");
  });

  it("redirects to members list when user is not found", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve(null);
    });

    await expect(AdminMemberDetailPage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow("redirect:/admin/members");
  });

  it("shows the invite button when member has a passwordHash but email is unverified", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve(buildMember({ emailVerified: false, passwordHash: "hashed-pwd" }));
    });

    render(await AdminMemberDetailPage({ params: Promise.resolve({ id: "member-1" }) }));

    expect(screen.getByTestId("invite-button")).toBeInTheDocument();
  });

  it("hides the invite button when member has no passwordHash", async () => {
    mockUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "admin-1") {
        return Promise.resolve({ id: "admin-1", role: "ADMIN", status: "ACTIVE" });
      }
      return Promise.resolve(buildMember({ emailVerified: false, passwordHash: null }));
    });

    render(await AdminMemberDetailPage({ params: Promise.resolve({ id: "member-1" }) }));

    expect(screen.queryByTestId("invite-button")).not.toBeInTheDocument();
  });
});
