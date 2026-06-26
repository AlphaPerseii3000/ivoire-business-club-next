import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OnboardingProgressWidget } from "./onboarding-progress-widget";

const mockSendVerificationRequest = vi.hoisted(() => vi.fn());

vi.mock("@/components/features/auth/resend-verification-button", () => ({
  default: function MockResendVerificationButton() {
    return <button data-testid="resend-verification-button">Renvoyer l'email</button>;
  },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

describe("OnboardingProgressWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disappears when both steps are complete", () => {
    const { container } = render(
      <OnboardingProgressWidget emailVerified onboardingCompleted />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders 0% when no step is complete", () => {
    render(
      <OnboardingProgressWidget
        emailVerified={false}
        onboardingCompleted={false}
      />
    );

    expect(screen.getByTestId("onboarding-percentage")).toHaveTextContent("0%");
    expect(screen.getByTestId("onboarding-progress-bar")).toHaveAttribute(
      "style",
      "width: 0%;"
    );
  });

  it("renders 50% when only email is verified", () => {
    render(
      <OnboardingProgressWidget
        emailVerified
        onboardingCompleted={false}
      />
    );

    expect(screen.getByTestId("onboarding-percentage")).toHaveTextContent("50%");
    expect(screen.getByTestId("onboarding-progress-bar")).toHaveAttribute(
      "style",
      "width: 50%;"
    );
  });

  it("renders 50% when only profile is complete", () => {
    render(
      <OnboardingProgressWidget
        emailVerified={false}
        onboardingCompleted
      />
    );

    expect(screen.getByTestId("onboarding-percentage")).toHaveTextContent("50%");
    expect(screen.getByTestId("onboarding-progress-bar")).toHaveAttribute(
      "style",
      "width: 50%;"
    );
  });

  it("renders 100% visually when both are complete and disappears", () => {
    const { container } = render(
      <OnboardingProgressWidget emailVerified onboardingCompleted />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows a clickable CTA for the profile step", () => {
    render(
      <OnboardingProgressWidget
        emailVerified
        onboardingCompleted={false}
      />
    );

    const cta = screen.getByTestId("cta-complete-profile");
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/onboarding/complete-profile");
  });

  it("shows the resend verification button when email is not verified", () => {
    render(
      <OnboardingProgressWidget
        emailVerified={false}
        onboardingCompleted={false}
      />
    );

    expect(screen.getByTestId("resend-verification-button")).toBeInTheDocument();
  });

  it("shows priority border and pulse animation when priority is true and incomplete", () => {
    render(
      <OnboardingProgressWidget
        emailVerified={false}
        onboardingCompleted={false}
        priority
      />
    );

    const widget = screen.getByTestId("onboarding-progress-widget");
    expect(widget.className).toContain("border-destructive");
    expect(widget.className).toContain("bg-destructive/5");
  });

  it("does not show priority style when complete even if priority is true", () => {
    const { container } = render(
      <OnboardingProgressWidget
        emailVerified
        onboardingCompleted
        priority
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("uses amber styling by default when incomplete but not priority", () => {
    render(
      <OnboardingProgressWidget
        emailVerified={false}
        onboardingCompleted={false}
        priority={false}
      />
    );

    const widget = screen.getByTestId("onboarding-progress-widget");
    expect(widget.className).toContain("border-amber-200");
    expect(widget.className).toContain("bg-amber-50");
  });

  it("displays red cross for incomplete steps and green check for complete ones", () => {
    render(
      <OnboardingProgressWidget
        emailVerified
        onboardingCompleted={false}
      />
    );

    expect(screen.getByTestId("step-email-status")).toHaveTextContent("✓");
    expect(screen.getByTestId("step-profile-status")).toHaveTextContent("✗");
  });
});
