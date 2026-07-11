import { PostHog } from "posthog-node";

const isTestEnv = process.env.NODE_ENV === "test";
const isProd = process.env.NODE_ENV === "production";

// Cache environment variables once in production to avoid CPU-heavy process.env lookups
const cachedKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const cachedHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

class DummyPostHog {
  capture(..._: unknown[]) {}
  identify(..._: unknown[]) {}
  alias(..._: unknown[]) {}
  shutdown() { return Promise.resolve(); }
  flush() { return Promise.resolve(); }
  isFeatureEnabled(..._: unknown[]) { return Promise.resolve(false); }
  getFeatureFlag(..._: unknown[]) { return Promise.resolve(undefined); }
  getFeatureFlagPayload(..._: unknown[]) { return Promise.resolve(undefined); }
  reloadFeatureFlags() { return Promise.resolve(); }
}

const globalForPostHog = globalThis as unknown as {
  posthogServer: PostHog | DummyPostHog | undefined;
  posthogKey: string | undefined;
  posthogHost: string | undefined;
};

function getActivePostHogClient(): PostHog | DummyPostHog {
  let currentKey = cachedKey;
  let currentHost = cachedHost;

  // In non-production, check environment variables dynamically for hot-reloading
  if (!isProd) {
    currentKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    currentHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

    if (
      globalForPostHog.posthogKey !== currentKey ||
      globalForPostHog.posthogHost !== currentHost
    ) {
      const stale = globalForPostHog.posthogServer;
      if (stale && "shutdown" in stale) {
        try {
          (stale as any).shutdown();
        } catch (err) {
          console.error("Error shutting down stale PostHog client:", err);
        }
      }
      globalForPostHog.posthogServer = undefined;
    }
  }

  if (!globalForPostHog.posthogServer) {
    const shouldInitialize = !isTestEnv && !!currentKey;
    if (shouldInitialize) {
      globalForPostHog.posthogServer = new PostHog(currentKey, {
        host: currentHost,
        flushAt: 1,
        flushInterval: 0,
      });
    } else {
      globalForPostHog.posthogServer = new DummyPostHog();
    }
    globalForPostHog.posthogKey = currentKey;
    globalForPostHog.posthogHost = currentHost;
  }

  return globalForPostHog.posthogServer;
}

// Proxy wrapper around the active client instance
export const posthogServer = new Proxy({}, {
  get(target, prop, receiver) {
    const client = getActivePostHogClient();
    let original = Reflect.get(client, prop);
    
    // Fallback: if a method does not exist on the client (e.g. DummyPostHog or future APIs),
    // return a safe no-op function instead of crashing.
    if (original === undefined) {
      return function (...args: any[]) {
        const asyncMethods = ["isFeatureEnabled", "getFeatureFlag", "getFeatureFlagPayload", "shutdown", "flush", "reloadFeatureFlags"];
        if (asyncMethods.includes(String(prop))) {
          if (prop === "isFeatureEnabled") return Promise.resolve(false);
          return Promise.resolve(undefined);
        }
        return undefined;
      };
    }

    if (typeof original === "function") {
      return function (...args: any[]) {
        // Map deprecated close calls to shutdown
        const propName = prop === "close" ? "shutdown" : prop;
        const targetMethod = prop === "close" ? (client as any).shutdown : original;

        try {
          const result = targetMethod.apply(client, args);
          if (result instanceof Promise) {
            return result.catch((err) => {
              console.error(`PostHog error in async method ${String(propName)}:`, err);
              if (propName === "isFeatureEnabled") return false;
              return undefined;
            });
          }
          return result;
        } catch (err) {
          console.error(`PostHog error in method ${String(propName)}:`, err);
          const asyncMethods = ["isFeatureEnabled", "getFeatureFlag", "getFeatureFlagPayload", "shutdown", "flush", "reloadFeatureFlags", "close"];
          if (asyncMethods.includes(String(propName))) {
            if (propName === "isFeatureEnabled") return Promise.resolve(false);
            return Promise.resolve(undefined);
          }
          if (propName === "isFeatureEnabled") return false;
          return undefined;
        }
      };
    }
    return original;
  }
}) as unknown as PostHog;

// Register process shutdown hooks once globally to avoid Next.js dev server listener leaks
const globalForShutdown = globalThis as unknown as {
  shutdownRegistered: boolean | undefined;
};

if (typeof process !== "undefined" && !globalForShutdown.shutdownRegistered) {
  const shutdown = async () => {
    const client = globalForPostHog.posthogServer;
    if (client) {
      try {
        if ("flush" in client) {
          await (client as any).flush();
        }
        if ("shutdown" in client) {
          await (client as any).shutdown();
        }
      } catch (err) {
        console.error("Error flushing/shutting down PostHog client:", err);
      }
    }
  };

  process.once("SIGTERM", async () => {
    await shutdown();
    process.kill(process.pid, "SIGTERM");
  });

  process.once("SIGINT", async () => {
    await shutdown();
    process.kill(process.pid, "SIGINT");
  });

  globalForShutdown.shutdownRegistered = true;
}
