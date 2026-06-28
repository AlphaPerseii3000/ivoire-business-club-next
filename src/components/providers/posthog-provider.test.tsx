import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CSPostHogProvider, PostHogPageView } from "./posthog-provider";

// Mock posthog-js
vi.mock("posthog-js", () => {
  return {
    default: {
      init: vi.fn(),
      capture: vi.fn(),
    },
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

describe("PostHogProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const { container } = render(<PostHogPageView />);
    expect(container).toBeEmptyDOMElement();
  });
});
