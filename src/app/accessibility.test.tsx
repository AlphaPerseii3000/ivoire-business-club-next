import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import * as axeMatchers from "vitest-axe/matchers";
import fs from "fs";
import path from "path";
import RootLayout from "./layout";

// @ts-ignore
expect.extend(axeMatchers);

// Mock next/font/google
vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "mocked-inter-class" }),
}));

// Mock posthog-provider components to avoid full context complexity
vi.mock("@/components/providers/posthog-provider", () => ({
  CSPostHogProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="posthog-provider">{children}</div>,
  PostHogPageView: () => <div data-testid="posthog-pageview" />,
  PostHogIdentitySync: () => <div data-testid="posthog-identity-sync" />,
}));

// Mock auth-provider to avoid full context complexity
vi.mock("@/components/auth-provider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}));

// Mock theme-provider to avoid full context complexity
vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div data-testid="sonner-toaster" />,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-provider">{children}</div>,
}));

describe("Accessibility and Core Layout Tests", () => {
  it("verifies that the root layout defines the language as French ('fr')", () => {
    // Note: Rendering html/body inside jsdom can be direct or checked via baseElement
    const { baseElement } = render(<RootLayout>Test Content</RootLayout>);
    const htmlElement = baseElement.ownerDocument.documentElement;
    expect(htmlElement.getAttribute("lang")).toBe("fr");
  });

  it("verifies that globals.css contains the prefers-reduced-motion media query with duration overrides", () => {
    const cssPath = path.resolve(__dirname, "./globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    
    expect(cssContent).toContain("@media (prefers-reduced-motion: reduce)");
    expect(cssContent).toContain("animation-duration: 0.01ms !important");
    expect(cssContent).toContain("transition-duration: 0.01ms !important");
    expect(cssContent).toContain("scroll-behavior: auto !important");
  });

  it("runs an automated axe accessibility audit on rendered content", async () => {
    const { container } = render(
      <main>
        <h1>Ivoire Business Club</h1>
        <button aria-label="Valider">OK</button>
      </main>
    );
    const results = await axe(container);
    (expect(results) as any).toHaveNoViolations();
  });
});
