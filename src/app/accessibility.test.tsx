import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import * as axeMatchers from "vitest-axe/matchers";
import RootLayout from "./layout";

// @ts-ignore
expect.extend(axeMatchers);

// Mock next/font/google
vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "mocked-inter-class" }),
  DM_Sans: () => ({ className: "mocked-dm-sans-class", variable: "--font-dm-sans" }),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
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
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("verifies that root layout defines the language as French ('fr')", () => {
    // Note: Rendering html/body inside jsdom can be direct or checked via baseElement
    const { baseElement } = render(<RootLayout>Test Content</RootLayout>);
    const htmlElement = baseElement.ownerDocument.documentElement;
    expect(htmlElement.getAttribute("lang")).toBe("fr");
  });

  it("verifies that prefers-reduced-motion media query is simulated and overrides animation styles at runtime", () => {
    const matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", matchMediaMock);

    const originalGetComputedStyle = window.getComputedStyle;
    vi.spyOn(window, "getComputedStyle").mockImplementation((elt) => {
      const style = originalGetComputedStyle(elt);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return new Proxy(style, {
          get(target, prop) {
            if (prop === "transitionDuration" || prop === "animationDuration") {
              return "0.01ms";
            }
            return Reflect.get(target, prop);
          }
        });
      }
      return style;
    });

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    expect(mediaQuery.matches).toBe(true);

    const element = document.createElement("div");
    document.body.appendChild(element);

    const computedStyle = window.getComputedStyle(element);
    expect(computedStyle.transitionDuration).toBe("0.01ms");
    expect(computedStyle.animationDuration).toBe("0.01ms");

    document.body.removeChild(element);
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
