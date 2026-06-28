"use client";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CSPostHogProvider, PostHogIdentitySync, PostHogPageView } from "./posthog-provider";

// Mock posthog-js
const mockIdentify = vi.hoisted(() => vi.fn());
const mockCapture = vi.hoisted(() => vi.fn());
const mockInit = vi.hoisted(() => vi.fn());

vi.mock("posthog-js", () => {
  return {
    default: {
      init: mockInit,
      capture: mockCapture,
      identify: mockIdentify,
    },
  };
});

// Mock next-auth/react
const mockUseSession = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => {
  return {
    useSession: mockUseSession,
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock next/navigation
vi.mock("next/navigation", () => {
  return {
    usePathname: () => "/test-path",
    useSearchParams: () => ({
      toString: () => "query=test",
    }),
  };
});

function renderWithProviders(children: React.ReactNode) {
  return render(
    <CSPostHogProvider>
      {children}
    </CSPostHogProvider>
  );
}

describe("PostHogProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null, status: "loading" });
  });

  it("renders children correctly", () => {
    render(
      <CSPostHogProvider>
        <div data-testid="child">Test Content</div>
      </CSPostHogProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders PostHogPageView without crashing", () => {
    const { container } = render(
      <CSPostHogProvider>
        <PostHogPageView />
      </CSPostHogProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("identifies authenticated user with tier and role", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          tier: "GRAND_FRERE",
          role: "MEMBER",
        },
      },
      status: "authenticated",
    });

    renderWithProviders(<PostHogIdentitySync />);

    expect(mockIdentify).toHaveBeenCalledWith("user-123", {
      email: "test@example.com",
      name: "Test User",
      tier: "GRAND_FRERE",
      role: "MEMBER",
    });
  });

  it("does not identify when session is loading", () => {
    mockUseSession.mockReturnValue({ data: null, status: "loading" });

    renderWithProviders(<PostHogIdentitySync />);

    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it("does not identify when user is unauthenticated", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });

    renderWithProviders(<PostHogIdentitySync />);

    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it("is idempotent and does not re-identify with unchanged session", () => {
    const sessionData = {
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        tier: "GRAND_FRERE",
        role: "MEMBER",
      },
    };

    mockUseSession.mockReturnValue({ data: sessionData, status: "authenticated" });

    const { rerender } = renderWithProviders(<PostHogIdentitySync />);
    expect(mockIdentify).toHaveBeenCalledTimes(1);

    rerender(
      <CSPostHogProvider>
        <PostHogIdentitySync />
      </CSPostHogProvider>
    );

    expect(mockIdentify).toHaveBeenCalledTimes(1);
  });

  it("re-identifies when role changes", () => {
    const baseSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        tier: "GRAND_FRERE",
        role: "MEMBER",
      },
    };

    mockUseSession.mockReturnValue({ data: baseSession, status: "authenticated" });

    const { rerender } = renderWithProviders(<PostHogIdentitySync />);
    expect(mockIdentify).toHaveBeenCalledTimes(1);

    const updatedSession = {
      user: {
        ...baseSession.user,
        role: "ADMIN",
      },
    };

    mockUseSession.mockReturnValue({ data: updatedSession, status: "authenticated" });
    rerender(
      <CSPostHogProvider>
        <PostHogIdentitySync />
      </CSPostHogProvider>
    );

    expect(mockIdentify).toHaveBeenCalledTimes(2);
    expect(mockIdentify).toHaveBeenLastCalledWith("user-123", {
      email: "test@example.com",
      name: "Test User",
      tier: "GRAND_FRERE",
      role: "ADMIN",
    });
  });
});
