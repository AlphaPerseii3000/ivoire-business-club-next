import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./dev.db";
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

import { AdminMemberActions } from "./admin-member-actions";

describe("AdminMemberActions Component", () => {
  it("renders status label and action buttons correctly", () => {
    render(
      <AdminMemberActions
        userId="member-123"
        status="ACTIVE"
        verificationStatus="PENDING"
        isCurrentAdmin={false}
        hasEmail={true}
        canVerifyMember={true}
        missingPrerequisites={[]}
      />
    );

    expect(screen.getByRole("button", { name: "Suspendre" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vérifier ✓" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejeter ✗" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer email de confirmation" })).toBeInTheDocument();
  });

  it("disables verification button and shows warning if not eligible", async () => {
    render(
      <AdminMemberActions
        userId="member-123"
        status="ACTIVE"
        verificationStatus="PENDING"
        isCurrentAdmin={false}
        hasEmail={true}
        canVerifyMember={false}
        missingPrerequisites={["EMAIL_UNVERIFIED", "BIO_MISSING"]}
      />
    );

    const verifyBtn = screen.getByRole("button", { name: "Vérifier ✓" });
    expect(verifyBtn).toBeDisabled();
    expect(verifyBtn).toHaveClass("pointer-events-none");
    expect(verifyBtn).toHaveClass("opacity-50");

    // The reject button is still active (reject is allowed even if not eligible)
    expect(screen.getByRole("button", { name: "Rejeter ✗" })).toBeEnabled();
  });

  it("shows disabled self-suspension notice if current admin matches user", () => {
    render(
      <AdminMemberActions
        userId="admin-123"
        status="ACTIVE"
        verificationStatus="PENDING"
        isCurrentAdmin={true}
        hasEmail={true}
        canVerifyMember={true}
        missingPrerequisites={[]}
      />
    );

    const suspendBtn = screen.getByRole("button", { name: "Suspendre" });
    expect(suspendBtn).toBeDisabled();
    expect(screen.getByText("Auto-suspension désactivée.")).toBeInTheDocument();
  });
});
