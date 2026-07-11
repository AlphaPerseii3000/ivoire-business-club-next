import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PostHog } from "posthog-node";

vi.mock("posthog-node", () => {
  const mockCapture = vi.fn();
  const mockIdentify = vi.fn();
  const mockAlias = vi.fn();
  const mockShutdown = vi.fn().mockResolvedValue(undefined);
  const mockFlush = vi.fn().mockResolvedValue(undefined);
  const mockIsFeatureEnabled = vi.fn().mockResolvedValue(false);
  
  return {
    PostHog: vi.fn().mockImplementation(function () {
      return {
        capture: mockCapture,
        identify: mockIdentify,
        alias: mockAlias,
        shutdown: mockShutdown,
        flush: mockFlush,
        isFeatureEnabled: mockIsFeatureEnabled,
      };
    }),
  };
});

describe("posthogServer safety proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    // Clear global posthog state between tests
    const g = globalThis as any;
    g.posthogServer = undefined;
    g.posthogKey = undefined;
    g.posthogHost = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should not crash if NEXT_PUBLIC_POSTHOG_KEY is not set (uses dummy)", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    
    vi.resetModules();
    const { posthogServer } = await import("./posthog-server");

    // Calling methods on proxy should not throw
    expect(() => posthogServer.capture({ distinctId: "123", event: "test" })).not.toThrow();
    expect(PostHog).not.toHaveBeenCalled();
  });

  it("should initialize PostHog when KEY is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://test.posthog.com");
    vi.stubEnv("NODE_ENV", "production");
    
    vi.resetModules();
    const { posthogServer } = await import("./posthog-server");

    posthogServer.capture({ distinctId: "123", event: "test" });

    expect(PostHog).toHaveBeenCalledWith("test-key", expect.objectContaining({
      host: "https://test.posthog.com",
    }));
  });

  it("should catch synchronous errors in PostHog methods", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-key");
    vi.stubEnv("NODE_ENV", "production");
    
    vi.resetModules();
    const { posthogServer } = await import("./posthog-server");

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Call once to initialize PostHog
    posthogServer.capture({ distinctId: "123", event: "test" });
    
    // Retrieve the mock instance
    const mockClientInstance = vi.mocked(PostHog).mock.results[0].value;
    mockClientInstance.capture.mockImplementationOnce(() => {
      throw new Error("Network down");
    });

    // Calling it again should throw internally but proxy catches and returns undefined
    expect(() => {
      const res = posthogServer.capture({ distinctId: "123", event: "test" });
      expect(res).toBeUndefined();
    }).not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should catch asynchronous promise rejections in PostHog methods", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-key");
    vi.stubEnv("NODE_ENV", "production");

    vi.resetModules();
    const { posthogServer } = await import("./posthog-server");

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Call once to initialize
    posthogServer.capture({ distinctId: "123", event: "test" });
    const mockClientInstance = vi.mocked(PostHog).mock.results[0].value;

    mockClientInstance.isFeatureEnabled.mockRejectedValueOnce(new Error("Async timeout"));

    const isEnabled = await posthogServer.isFeatureEnabled("feature", "123");
    expect(isEnabled).toBe(false); // fallback value for isFeatureEnabled

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should re-initialize PostHog in dev environment if env vars change", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "key-1");
    vi.stubEnv("NODE_ENV", "development");

    vi.resetModules();
    const { posthogServer } = await import("./posthog-server");

    // Call to initialize client with key-1
    posthogServer.capture({ distinctId: "123", event: "test" });
    expect(PostHog).toHaveBeenLastCalledWith("key-1", expect.any(Object));

    // Change key and call again
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "key-2");
    posthogServer.capture({ distinctId: "123", event: "test" });

    expect(PostHog).toHaveBeenLastCalledWith("key-2", expect.any(Object));
    expect(PostHog).toHaveBeenCalledTimes(2);
  });
});
