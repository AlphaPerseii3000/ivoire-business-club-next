import { PostHog } from "posthog-node";

const isTestEnv = process.env.NODE_ENV === "test";

class DummyPostHog {
  capture(..._: unknown[]) {}
  identify(..._: unknown[]) {}
  alias(..._: unknown[]) {}
  close() { return Promise.resolve(); }
  flush() { return Promise.resolve(); }
  isFeatureEnabled(..._: unknown[]) { return Promise.resolve(false); }
  getFeatureFlag(..._: unknown[]) { return Promise.resolve(undefined); }
  getFeatureFlagPayload(..._: unknown[]) { return Promise.resolve(undefined); }
}

const globalForPostHog = globalThis as unknown as {
  posthogServer: PostHog | DummyPostHog | undefined;
  posthogKey: string | undefined;
  posthogHost: string | undefined;
};

function getActivePostHogClient(): PostHog | DummyPostHog {
  const currentKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const currentHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

  if (process.env.NODE_ENV !== "production" && !isTestEnv) {
    if (
      globalForPostHog.posthogKey !== currentKey ||
      globalForPostHog.posthogHost !== currentHost
    ) {
      if (globalForPostHog.posthogServer && "close" in globalForPostHog.posthogServer) {
        try {
          (globalForPostHog.posthogServer as PostHog).close();
        } catch (err) {
          console.error("Error closing stale PostHog client:", err);
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

export const posthogServer = new Proxy({}, {
  get(target, prop, receiver) {
    const client = getActivePostHogClient();
    const original = Reflect.get(client, prop);
    
    if (typeof original === "function") {
      return function (...args: any[]) {
        try {
          const result = original.apply(client, args);
          if (result instanceof Promise) {
            return result.catch((err) => {
              console.error(`PostHog error in async method ${String(prop)}:`, err);
              if (prop === "isFeatureEnabled") return false;
              return undefined;
            });
          }
          return result;
        } catch (err) {
          console.error(`PostHog error in method ${String(prop)}:`, err);
          if (prop === "isFeatureEnabled") return Promise.resolve(false);
          if (prop === "close" || prop === "flush") return Promise.resolve();
          return undefined;
        }
      };
    }
    return original;
  }
}) as PostHog;

if (typeof process !== "undefined") {
  const shutdown = async () => {
    const client = globalForPostHog.posthogServer;
    if (client && "flush" in client) {
      try {
        await (client as PostHog).flush();
        await (client as PostHog).close();
      } catch (err) {
        console.error("Error flushing/closing PostHog during shutdown:", err);
      }
    }
  };
  process.once("SIGTERM", async () => {
    await shutdown();
    process.exit(0);
  });
  process.once("SIGINT", async () => {
    await shutdown();
    process.exit(0);
  });
}

